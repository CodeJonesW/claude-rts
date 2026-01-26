import { useCallback } from 'react'
import { useTerminalStore } from '../stores/terminalStore'

interface TerminalTabsProps {
  onNewTerminal: () => void
  onCloseTerminal: (id: number) => void
}

export default function TerminalTabs({ onNewTerminal, onCloseTerminal }: TerminalTabsProps) {
  const { terminals, activeTerminalId, setActiveTerminal } = useTerminalStore()

  const handleTabClick = useCallback(
    (id: number) => {
      setActiveTerminal(id)
    },
    [setActiveTerminal]
  )

  const handleCloseClick = useCallback(
    (e: React.MouseEvent, id: number) => {
      e.stopPropagation()
      onCloseTerminal(id)
    },
    [onCloseTerminal]
  )

  if (terminals.length === 0) {
    return null
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        background: 'rgba(20, 25, 35, 0.95)',
        borderBottom: '1px solid rgba(100, 150, 255, 0.2)',
        padding: '0 4px',
        gap: 4,
        overflowX: 'auto',
        overflowY: 'hidden',
      }}
    >
      {terminals.map((terminal) => {
        const isActive = terminal.id === activeTerminalId
        return (
          <div
            key={terminal.id}
            onClick={() => handleTabClick(terminal.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '6px 8px',
              background: isActive ? 'rgba(100, 150, 255, 0.15)' : 'transparent',
              borderBottom: isActive ? '2px solid #00ff88' : '2px solid transparent',
              cursor: 'pointer',
              userSelect: 'none',
              minWidth: 'fit-content',
              transition: 'all 0.2s',
            }}
            onMouseEnter={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'rgba(100, 150, 255, 0.08)'
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.currentTarget.style.background = 'transparent'
              }
            }}
          >
            <span
              style={{
                color: isActive ? '#e0e0e0' : '#8899aa',
                fontSize: 12,
                fontFamily: 'system-ui',
                whiteSpace: 'nowrap',
              }}
            >
              Terminal #{terminal.id}
            </span>
            <button
              onClick={(e) => handleCloseClick(e, terminal.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#667788',
                cursor: 'pointer',
                fontSize: 14,
                padding: '0 2px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: 16,
                height: 16,
                borderRadius: 3,
                transition: 'all 0.15s',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(255, 85, 85, 0.2)'
                e.currentTarget.style.color = '#ff5555'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = '#667788'
              }}
            >
              ×
            </button>
          </div>
        )
      })}
      <button
        onClick={onNewTerminal}
        style={{
          background: 'transparent',
          border: 'none',
          color: '#00ff88',
          cursor: 'pointer',
          fontSize: 18,
          padding: '4px 8px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderRadius: 4,
          transition: 'all 0.15s',
          marginLeft: 'auto',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(0, 255, 136, 0.1)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
        }}
        title="New Terminal"
      >
        +
      </button>
    </div>
  )
}
