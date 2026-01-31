use parking_lot::Mutex;
use portable_pty::{native_pty_system, CommandBuilder, PtySize};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::io::{Read, Write};
use std::path::PathBuf;
use std::sync::Arc;
use std::thread;
use tauri::{AppHandle, Emitter};

/// Claude Code usage statistics
#[derive(Debug, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ClaudeStats {
    pub input_tokens: u64,
    pub output_tokens: u64,
    pub cache_read_input_tokens: u64,
    pub cache_creation_input_tokens: u64,
    pub cost_usd: f64,
}

/// Model usage from Claude's stats file
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ModelUsage {
    input_tokens: Option<u64>,
    output_tokens: Option<u64>,
    cache_read_input_tokens: Option<u64>,
    cache_creation_input_tokens: Option<u64>,
    cost_u_s_d: Option<f64>,
}

/// Claude stats cache file structure
#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
struct StatsCacheFile {
    model_usage: Option<std::collections::HashMap<String, ModelUsage>>,
}

/// Get the path to Claude's config directory
fn get_claude_dir() -> Option<PathBuf> {
    dirs::home_dir().map(|h| h.join(".claude"))
}

/// Read Claude Code usage stats from ~/.claude/stats-cache.json
#[tauri::command]
fn get_claude_stats() -> Result<ClaudeStats, String> {
    let claude_dir = get_claude_dir().ok_or("Could not find home directory")?;
    let stats_file = claude_dir.join("stats-cache.json");

    if !stats_file.exists() {
        return Ok(ClaudeStats::default());
    }

    let content = fs::read_to_string(&stats_file)
        .map_err(|e| format!("Failed to read stats file: {}", e))?;

    let data: StatsCacheFile = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse stats file: {}", e))?;

    let mut stats = ClaudeStats::default();

    // Aggregate across all models
    if let Some(model_usage) = data.model_usage {
        for usage in model_usage.values() {
            stats.input_tokens += usage.input_tokens.unwrap_or(0);
            stats.output_tokens += usage.output_tokens.unwrap_or(0);
            stats.cache_read_input_tokens += usage.cache_read_input_tokens.unwrap_or(0);
            stats.cache_creation_input_tokens += usage.cache_creation_input_tokens.unwrap_or(0);
            stats.cost_usd += usage.cost_u_s_d.unwrap_or(0.0);
        }
    }

    // Calculate cost if not provided (Opus pricing)
    if stats.cost_usd == 0.0 {
        stats.cost_usd = (stats.input_tokens as f64 / 1_000_000.0 * 15.0)
            + (stats.output_tokens as f64 / 1_000_000.0 * 75.0)
            + (stats.cache_read_input_tokens as f64 / 1_000_000.0 * 1.875)
            + (stats.cache_creation_input_tokens as f64 / 1_000_000.0 * 18.75);
    }

    Ok(stats)
}

/// Scan a directory for files (used when server isn't running)
#[tauri::command]
fn scan_directory(path: String, max_depth: u32) -> Result<Vec<FileEntry>, String> {
    let path = PathBuf::from(&path);
    if !path.exists() {
        return Err(format!("Path does not exist: {}", path.display()));
    }

    let mut entries = Vec::new();
    scan_dir_recursive(&path, &path, max_depth, 0, &mut entries);
    Ok(entries)
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileEntry {
    pub path: String,
    pub file_type: String, // "file" or "directory"
    pub name: String,
}

fn scan_dir_recursive(
    base: &PathBuf,
    current: &PathBuf,
    max_depth: u32,
    depth: u32,
    entries: &mut Vec<FileEntry>,
) {
    if depth >= max_depth {
        return;
    }

    let Ok(read_dir) = fs::read_dir(current) else {
        return;
    };

    for entry in read_dir.flatten() {
        let path = entry.path();
        let name = entry.file_name().to_string_lossy().to_string();

        // Skip hidden files and common non-essential directories
        if name.starts_with('.') {
            continue;
        }
        if matches!(
            name.as_str(),
            "node_modules" | "dist" | "build" | "target" | "__pycache__" | "venv" | ".git"
        ) {
            continue;
        }

        let is_dir = path.is_dir();
        entries.push(FileEntry {
            path: path.to_string_lossy().to_string(),
            file_type: if is_dir { "directory" } else { "file" }.to_string(),
            name,
        });

        if is_dir {
            scan_dir_recursive(base, &path, max_depth, depth + 1, entries);
        }
    }
}

/// Read a file's contents
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file: {}", e))
}

// ============================================================================
// PTY / Terminal Support
// ============================================================================

/// Holds a PTY instance and its writer
struct PtyInstance {
    writer: Box<dyn Write + Send>,
    _pair: portable_pty::PtyPair,
}

/// Global state for managing terminal instances
struct TerminalState {
    terminals: HashMap<u32, PtyInstance>,
    next_id: u32,
}

impl TerminalState {
    fn new() -> Self {
        Self {
            terminals: HashMap::new(),
            next_id: 1,
        }
    }
}

/// Terminal output event sent to frontend
#[derive(Clone, Serialize)]
struct TerminalOutput {
    id: u32,
    data: String,
}

/// Terminal exit event sent to frontend
#[derive(Clone, Serialize)]
struct TerminalExit {
    id: u32,
    code: Option<u32>,
}

/// Create a new terminal and return its ID
#[tauri::command]
fn terminal_create(
    app: AppHandle,
    state: tauri::State<'_, Arc<Mutex<TerminalState>>>,
    rows: u16,
    cols: u16,
    cwd: Option<String>,
) -> Result<u32, String> {
    let pty_system = native_pty_system();

    let pair = pty_system
        .openpty(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to open PTY: {}", e))?;

    // Get the user's shell
    let shell = std::env::var("SHELL").unwrap_or_else(|_| "/bin/bash".to_string());

    let mut cmd = CommandBuilder::new(&shell);
    cmd.arg("-l"); // Login shell to load profile

    // Set working directory
    if let Some(dir) = cwd {
        cmd.cwd(dir);
    } else if let Some(home) = dirs::home_dir() {
        cmd.cwd(home);
    }

    // Spawn the shell
    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| format!("Failed to spawn shell: {}", e))?;

    // Get writer for input
    let writer = pair
        .master
        .take_writer()
        .map_err(|e| format!("Failed to get PTY writer: {}", e))?;

    // Get reader for output
    let mut reader = pair
        .master
        .try_clone_reader()
        .map_err(|e| format!("Failed to get PTY reader: {}", e))?;

    // Allocate terminal ID
    let id = {
        let mut state = state.lock();
        let id = state.next_id;
        state.next_id += 1;
        state.terminals.insert(
            id,
            PtyInstance {
                writer,
                _pair: pair,
            },
        );
        id
    };

    // Spawn thread to read PTY output and emit to frontend
    let app_handle = app.clone();
    let term_id = id;
    thread::spawn(move || {
        let mut buf = [0u8; 4096];
        loop {
            match reader.read(&mut buf) {
                Ok(0) => break, // EOF
                Ok(n) => {
                    // Convert to string, replacing invalid UTF-8
                    let data = String::from_utf8_lossy(&buf[..n]).to_string();
                    let _ = app_handle.emit(
                        "terminal-output",
                        TerminalOutput {
                            id: term_id,
                            data,
                        },
                    );
                }
                Err(_) => break,
            }
        }

        // Wait for process to exit and get exit code
        let exit_code = child.wait().ok().map(|status| {
            status.exit_code()
        });

        let _ = app_handle.emit(
            "terminal-exit",
            TerminalExit {
                id: term_id,
                code: exit_code,
            },
        );
    });

    log::info!("Created terminal {} with shell {}", id, shell);
    Ok(id)
}

/// Write data to a terminal
#[tauri::command]
fn terminal_write(
    state: tauri::State<'_, Arc<Mutex<TerminalState>>>,
    id: u32,
    data: String,
) -> Result<(), String> {
    let mut state = state.lock();
    let terminal = state
        .terminals
        .get_mut(&id)
        .ok_or_else(|| format!("Terminal {} not found", id))?;

    terminal
        .writer
        .write_all(data.as_bytes())
        .map_err(|e| format!("Failed to write to terminal: {}", e))?;

    terminal
        .writer
        .flush()
        .map_err(|e| format!("Failed to flush terminal: {}", e))?;

    Ok(())
}

/// Resize a terminal
#[tauri::command]
fn terminal_resize(
    state: tauri::State<'_, Arc<Mutex<TerminalState>>>,
    id: u32,
    rows: u16,
    cols: u16,
) -> Result<(), String> {
    let state = state.lock();
    let terminal = state
        .terminals
        .get(&id)
        .ok_or_else(|| format!("Terminal {} not found", id))?;

    terminal
        ._pair
        .master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| format!("Failed to resize terminal: {}", e))?;

    Ok(())
}

/// Close a terminal
#[tauri::command]
fn terminal_close(
    state: tauri::State<'_, Arc<Mutex<TerminalState>>>,
    id: u32,
) -> Result<(), String> {
    let mut state = state.lock();
    state.terminals.remove(&id);
    log::info!("Closed terminal {}", id);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .manage(Arc::new(Mutex::new(TerminalState::new())))
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_claude_stats,
            scan_directory,
            read_file,
            terminal_create,
            terminal_write,
            terminal_resize,
            terminal_close,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
