import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

// Check if we're running in Tauri (v2 uses __TAURI_INTERNALS__)
const isTauri = typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)

interface TerminalProps {
  cwd?: string
  visible?: boolean
  terminalId: number | null
  onTerminalIdChange?: (id: number | null) => void
  onWriteReady?: (writeFn: (data: string) => Promise<void>) => void
}

export default function Terminal({
  cwd,
  visible = true,
  terminalId: externalTerminalId,
  onTerminalIdChange,
  onWriteReady,
}: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const terminalIdRef = useRef<number | null>(null)
  const writeCallbackRef = useRef<((data: string) => void) | null>(null)
  const [terminalReady, setTerminalReady] = useState(false)

  // Initialize terminal
  useEffect(() => {
    if (!containerRef.current || terminalRef.current) return

    const terminal = new XTerm({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'Menlo, Monaco, "Courier New", monospace',
      theme: {
        background: '#0a0a12',
        foreground: '#e0e0e0',
        cursor: '#00ff88',
        cursorAccent: '#0a0a12',
        selectionBackground: '#4466aa',
        black: '#1a1a2e',
        red: '#ff5555',
        green: '#00ff88',
        yellow: '#ffee55',
        blue: '#4a9eff',
        magenta: '#aa88ff',
        cyan: '#44aaff',
        white: '#e0e0e0',
        brightBlack: '#4a4a5e',
        brightRed: '#ff6666',
        brightGreen: '#66ff99',
        brightYellow: '#ffff66',
        brightBlue: '#66aaff',
        brightMagenta: '#bb99ff',
        brightCyan: '#66bbff',
        brightWhite: '#ffffff',
      },
      allowProposedApi: true,
      // Ensure terminal can receive input
      disableStdin: false,
    })

    // Set up onData handler immediately - forward to callback ref when connected
    terminal.onData((data) => {
      if (writeCallbackRef.current) {
        writeCallbackRef.current(data)
      }
    })

    const fitAddon = new FitAddon()
    const webLinksAddon = new WebLinksAddon()

    terminal.loadAddon(fitAddon)
    terminal.loadAddon(webLinksAddon)
    terminal.open(containerRef.current)

    // Initial fit and focus
    setTimeout(() => {
      fitAddon.fit()
      terminal.focus()
    }, 0)

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon
    setTerminalReady(true)

    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      if (fitAddonRef.current) {
        fitAddonRef.current.fit()
      }
    })
    resizeObserver.observe(containerRef.current)

    return () => {
      resizeObserver.disconnect()
      terminal.dispose()
      terminalRef.current = null
      setTerminalReady(false)
    }
  }, [])

  // Connect to Tauri PTY backend
  useEffect(() => {
    if (!terminalReady || !terminalRef.current) return
    if (!isTauri) {
      terminalRef.current.writeln('Terminal only available in Tauri app.')
      terminalRef.current.writeln('Run: npm run tauri:dev')
      return
    }

    let cleanup: (() => void) | null = null
    let unlistenOutput: (() => void) | null = null
    let unlistenExit: (() => void) | null = null

    const connect = async () => {
      // Clear terminal when switching to a different terminal
      if (terminalRef.current && terminalIdRef.current !== externalTerminalId) {
        terminalRef.current.clear()
      }
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const { listen } = await import('@tauri-apps/api/event')

        const terminal = terminalRef.current!
        const fitAddon = fitAddonRef.current!

        // Get terminal dimensions
        const cols = terminal.cols
        const rows = terminal.rows

        let id: number

        // Try to reconnect to existing terminal if provided
        if (externalTerminalId !== null && externalTerminalId !== undefined) {
          id = externalTerminalId
          terminalIdRef.current = id
          
          // Try to resize to verify the terminal still exists
          try {
            await invoke('terminal_resize', { id, rows, cols })
            console.log(`[Terminal] Reconnected to terminal ${id}`)
          } catch (err) {
            // Terminal doesn't exist anymore, create a new one
            console.log(`[Terminal] Terminal ${id} no longer exists, creating new terminal`)
            id = await invoke<number>('terminal_create', {
              rows,
              cols,
              cwd: cwd || undefined,
            })
            terminalIdRef.current = id
            if (onTerminalIdChange) {
              onTerminalIdChange(id)
            }
          }
        } else {
          // Create new terminal if none provided
          id = await invoke<number>('terminal_create', {
            rows,
            cols,
            cwd: cwd || undefined,
          })
          terminalIdRef.current = id
          if (onTerminalIdChange) {
            onTerminalIdChange(id)
          }
        }

        terminal.focus()

        // Listen for terminal output
        const outputUnlisten = await listen<{ id: number; data: string }>(
          'terminal-output',
          (event) => {
            if (event.payload.id === id) {
              terminal.write(event.payload.data)
            }
          }
        )
        unlistenOutput = outputUnlisten

        // Listen for terminal exit
        const exitUnlisten = await listen<{ id: number; code: number | null }>(
          'terminal-exit',
          (event) => {
            if (event.payload.id === id) {
              terminal.writeln('')
              terminal.writeln(
                `\x1b[90mProcess exited with code ${event.payload.code ?? 'unknown'}\x1b[0m`
              )
              // Note: We don't clear the terminal ID here anymore
              // The store will handle removal when the tab is closed
            }
          }
        )
        unlistenExit = exitUnlisten

        // Set up the write callback to send input to backend
        writeCallbackRef.current = async (data: string) => {
          try {
            await invoke('terminal_write', { id, data })
          } catch (err) {
            console.error('Failed to write to terminal:', err)
          }
        }

        // Expose write function to parent
        if (onWriteReady) {
          onWriteReady(async (data: string) => {
            await invoke('terminal_write', { id, data })
          })
        }

        // Handle resize
        terminal.onResize(async ({ cols, rows }) => {
          try {
            await invoke('terminal_resize', { id, rows, cols })
          } catch (err) {
            console.error('Failed to resize terminal:', err)
          }
        })

        // Trigger initial resize
        fitAddon.fit()

        cleanup = () => {
          writeCallbackRef.current = null
          if (unlistenOutput) unlistenOutput()
          if (unlistenExit) unlistenExit()
          // Don't close terminal on unmount - only close when explicitly requested
          // This allows reconnecting to the same terminal later
        }
      } catch (err) {
        console.error('Failed to create terminal:', err)
        if (terminalRef.current) {
          terminalRef.current.writeln(`\x1b[31mError: ${err}\x1b[0m`)
        }
      }
    }

    connect()

    return () => {
      if (cleanup) cleanup()
    }
  }, [terminalReady, cwd, externalTerminalId, onTerminalIdChange, onWriteReady])

  // Focus terminal when visible
  useEffect(() => {
    if (visible && terminalRef.current) {
      setTimeout(() => terminalRef.current?.focus(), 100)
    }
  }, [visible])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0a0a12',
        overflow: 'hidden',
      }}
    >
      {/* Terminal container */}
      <div
        ref={containerRef}
        tabIndex={0}
        onClick={() => {
          console.log('[Terminal] Container clicked, focusing terminal')
          terminalRef.current?.focus()
        }}
        onKeyDown={(e) => {
          // Prevent Three.js from capturing keyboard events
          e.stopPropagation()
        }}
        style={{
          flex: 1,
          padding: 8,
          overflow: 'hidden',
          cursor: 'text',
          outline: 'none',
        }}
      />
    </div>
  )
}
