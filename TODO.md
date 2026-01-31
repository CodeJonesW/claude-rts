# Claude RTS - TODO

## Completed

- [x] **Embedded terminal** - Full PTY terminal in Tauri app using xterm.js + Rust portable-pty

---

## High Priority

### Embed event server in Tauri backend
Move the Node.js event server (`server/event-server.ts`) into the Rust backend so the app is fully self-contained.

**Why:** Simplicity, not performance. Users won't need to run a separate server.

**Tasks:**
- [ ] Add HTTP server to Rust (use `axum` or `tiny_http`)
- [ ] Add WebSocket support (or use Tauri's event system for IPC)
- [ ] Listen on port 8766 for Claude hook POST requests
- [ ] Broadcast events to frontend via Tauri events (`app.emit()`)
- [ ] Update React app to listen via `@tauri-apps/api/event` instead of WebSocket
- [ ] Auto-start server when Tauri app launches
- [ ] Remove dependency on Node.js server

**Crates to consider:**
- `axum` - async HTTP framework
- `tokio` - async runtime (already used by Tauri)
- `tower-http` - CORS middleware

---

## Medium Priority

### Improve hook coverage
- [ ] Add hooks for more tool types (Task, WebFetch, etc.)
- [ ] Consider PreToolUse hooks for "thinking" state

### Better large directory handling
- [ ] Show item count on hidden directory nodes
- [ ] Add "Expand all" / "Collapse all" buttons to HUD
- [ ] Remember hidden state across sessions (localStorage)

### Performance
- [ ] Virtualize grid rendering for very large codebases (1000+ files)
- [ ] Throttle rapid event updates

---

## Low Priority / Nice to Have

### Visual improvements
- [ ] Animate nodes appearing/disappearing when hiding/showing
- [ ] Add minimap for navigation
- [ ] Keyboard shortcuts (H to hide, Esc to close menus)

### Features
- [ ] Search/filter files
- [ ] Click directory to focus camera on it
- [ ] Export session replay

### Build & Distribution
- [ ] Set up GitHub Actions for Tauri builds
- [ ] Code signing for macOS
- [ ] Auto-update support
