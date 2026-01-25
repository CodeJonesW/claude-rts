import { useEffect, useRef, useCallback, useState } from 'react'
import { Terminal as XTerm } from '@xterm/xterm'
import { FitAddon } from '@xterm/addon-fit'
import { WebLinksAddon } from '@xterm/addon-web-links'
import '@xterm/xterm/css/xterm.css'

// Check if we're running in Tauri (v2 uses __TAURI_INTERNALS__)
const isTauri = typeof window !== 'undefined' && ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)

interface TerminalProps {
  cwd?: string
  visible?: boolean
  onClose?: () => void
}

export default function Terminal({ cwd, visible = true, onClose }: TerminalProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const terminalRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const terminalIdRef = useRef<number | null>(null)
  const writeCallbackRef = useRef<((data: string) => void) | null>(null)
  const [isConnected, setIsConnected] = useState(false)
  const [error, setError] = useState<string | null>(null)
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

    const connect = async () => {
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        const { listen } = await import('@tauri-apps/api/event')

        const terminal = terminalRef.current!
        const fitAddon = fitAddonRef.current!

        // Get terminal dimensions
        const cols = terminal.cols
        const rows = terminal.rows

        // Create terminal in backend
        const id = await invoke<number>('terminal_create', {
          rows,
          cols,
          cwd: cwd || undefined,
        })

        terminalIdRef.current = id
        setIsConnected(true)
        terminal.focus()

        // Listen for terminal output
        const unlistenOutput = await listen<{ id: number; data: string }>(
          'terminal-output',
          (event) => {
            if (event.payload.id === id) {
              terminal.write(event.payload.data)
            }
          }
        )

        // Listen for terminal exit
        const unlistenExit = await listen<{ id: number; code: number | null }>(
          'terminal-exit',
          (event) => {
            if (event.payload.id === id) {
              terminal.writeln('')
              terminal.writeln(
                `\x1b[90mProcess exited with code ${event.payload.code ?? 'unknown'}\x1b[0m`
              )
              setIsConnected(false)
            }
          }
        )

        // Set up the write callback to send input to backend
        writeCallbackRef.current = async (data: string) => {
          try {
            await invoke('terminal_write', { id, data })
          } catch (err) {
            console.error('Failed to write to terminal:', err)
          }
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
          unlistenOutput()
          unlistenExit()
          invoke('terminal_close', { id }).catch(console.error)
        }
      } catch (err) {
        console.error('Failed to create terminal:', err)
        setError(String(err))
        if (terminalRef.current) {
          terminalRef.current.writeln(`\x1b[31mError: ${err}\x1b[0m`)
        }
      }
    }

    connect()

    return () => {
      if (cleanup) cleanup()
    }
  }, [terminalReady, cwd])

  // Focus terminal when visible
  useEffect(() => {
    if (visible && terminalRef.current) {
      setTimeout(() => terminalRef.current?.focus(), 100)
    }
  }, [visible])

  // Handle close
  const handleClose = useCallback(() => {
    if (onClose) onClose()
  }, [onClose])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: '#0a0a12',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid rgba(100, 150, 255, 0.2)',
      }}
    >
      {/* Title bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          background: 'rgba(20, 25, 35, 0.95)',
          borderBottom: '1px solid rgba(100, 150, 255, 0.2)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: isConnected ? '#00ff88' : error ? '#ff5555' : '#ffaa00',
            }}
          />
          <span style={{ color: '#aabbcc', fontSize: 12, fontFamily: 'system-ui' }}>
            Terminal {terminalIdRef.current ? `#${terminalIdRef.current}` : ''}
          </span>
        </div>
        {onClose && (
          <button
            onClick={handleClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#667788',
              cursor: 'pointer',
              fontSize: 16,
              padding: '0 4px',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.color = '#ffffff')}
            onMouseLeave={(e) => (e.currentTarget.style.color = '#667788')}
          >
            ×
          </button>
        )}
      </div>

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
