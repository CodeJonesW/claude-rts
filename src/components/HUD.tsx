import type { AgentEvent } from '../types'
import type { TokenUsage } from '../hooks/useTokenUsage'

// Format large token numbers (e.g., 1234567 -> "1.2M")
function formatTokens(tokens: number): string {
  if (tokens >= 1000000) {
    return `${(tokens / 1000000).toFixed(1)}M`
  }
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}K`
  }
  return tokens.toString()
}

interface HUDProps {
  connected: boolean
  totalCount: number
  eventHistory: AgentEvent[]
  onStartDemo: () => void
  onStopDemo: () => void
  isDemoRunning: boolean
  tokenUsage: TokenUsage
  onSetCostAlert: (threshold: number | null) => void
  terminalOpen?: boolean
  viewRoot?: string
  basePath?: string
  onNavigateTo?: (path: string) => void
  onNavigateUp?: () => void
  sidebarOpen: boolean
  onToggleSidebar: () => void
}

const sectionStyle: React.CSSProperties = {
  padding: '16px 20px',
  borderBottom: '1px solid rgba(0, 255, 136, 0.15)',
}

export default function HUD({
  connected,
  totalCount,
  eventHistory,
  onStartDemo,
  onStopDemo,
  isDemoRunning,
  tokenUsage,
  sidebarOpen,
  onToggleSidebar,
  viewRoot,
  basePath,
  onNavigateTo,
  onNavigateUp,
}: HUDProps) {
  const recentEvents = eventHistory.slice(-12).reverse()

  // Compute breadcrumb segments
  const showBreadcrumb = viewRoot && basePath && viewRoot !== basePath
  const basePathName = basePath?.split('/').pop() || 'root'
  const relativePath = showBreadcrumb ? viewRoot.replace(basePath + '/', '') : ''
  const segments = relativePath ? relativePath.split('/') : []

  return (
    <>
      {/* Hamburger button — always visible */}
      <button
        onClick={onToggleSidebar}
        style={{
          position: 'fixed',
          top: 16,
          left: 16,
          zIndex: 200,
          width: 36,
          height: 36,
          background: 'rgba(10, 10, 18, 0.85)',
          border: '1px solid rgba(0, 255, 136, 0.4)',
          borderRadius: 6,
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: sidebarOpen ? 0 : 4,
          padding: 0,
          transition: 'border-color 0.2s',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = '#00ff88'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(0, 255, 136, 0.4)'
        }}
      >
        {sidebarOpen ? (
          // X icon
          <>
            <span style={{
              display: 'block',
              width: 18,
              height: 2,
              background: '#00ff88',
              borderRadius: 1,
              transform: 'rotate(45deg) translateY(0px)',
              position: 'absolute',
            }} />
            <span style={{
              display: 'block',
              width: 18,
              height: 2,
              background: '#00ff88',
              borderRadius: 1,
              transform: 'rotate(-45deg) translateY(0px)',
              position: 'absolute',
            }} />
          </>
        ) : (
          // Hamburger lines
          <>
            <span style={{ display: 'block', width: 18, height: 2, background: '#00ff88', borderRadius: 1 }} />
            <span style={{ display: 'block', width: 18, height: 2, background: '#00ff88', borderRadius: 1 }} />
            <span style={{ display: 'block', width: 18, height: 2, background: '#00ff88', borderRadius: 1 }} />
          </>
        )}
      </button>

      {/* Sidebar panel */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 300,
        height: '100vh',
        background: 'rgba(10, 10, 18, 0.95)',
        borderRight: '1px solid rgba(0, 255, 136, 0.2)',
        zIndex: 150,
        transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
        transition: 'transform 0.3s ease',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: 'monospace',
        color: '#00ff88',
        overflowY: 'auto',
      }}>
        {/* Sidebar header spacer (room for hamburger) */}
        <div style={{ height: 60, flexShrink: 0 }} />

        {/* Status section */}
        <div style={sectionStyle}>
          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, letterSpacing: 1 }}>STATUS</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: connected ? '#00ff88' : isDemoRunning ? '#ff8800' : '#ff0044',
              boxShadow: connected
                ? '0 0 10px #00ff88'
                : isDemoRunning
                  ? '0 0 10px #ff8800'
                  : '0 0 10px #ff0044',
            }} />
            <span style={{ fontSize: 13 }}>
              {connected ? 'CONNECTED' : isDemoRunning ? 'DEMO MODE' : 'DISCONNECTED'}
            </span>
          </div>
        </div>

        {/* Files section */}
        <div style={sectionStyle}>
          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, letterSpacing: 1 }}>FILES</div>
          <div style={{ fontSize: 24, fontWeight: 'bold' }}>{totalCount}</div>
        </div>

        {/* Session Cost section */}
        <div style={{
          ...sectionStyle,
          background: tokenUsage.isOverBudget ? 'rgba(255, 0, 68, 0.1)' : 'transparent',
        }}>
          <div style={{
            fontSize: 11,
            opacity: 0.5,
            marginBottom: 8,
            letterSpacing: 1,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}>
            <span>SESSION COST</span>
            <div style={{ display: 'flex', gap: 6 }}>
              {tokenUsage.isOverBudget && (
                <span style={{
                  fontSize: 9,
                  background: '#ff0044',
                  color: '#fff',
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontWeight: 'bold',
                  opacity: 1,
                }}>ALERT</span>
              )}
              {tokenUsage.isRealData && (
                <span style={{
                  fontSize: 9,
                  background: '#00ff88',
                  color: '#000',
                  padding: '2px 6px',
                  borderRadius: 3,
                  fontWeight: 'bold',
                  opacity: 1,
                }}>LIVE</span>
              )}
            </div>
          </div>

          {/* Cost display */}
          <div style={{
            fontSize: 28,
            fontWeight: 'bold',
            color: tokenUsage.isOverBudget
              ? '#ff0044'
              : tokenUsage.costUSD > 1
                ? '#ff8800'
                : '#00ff88',
            marginBottom: 12,
          }}>
            ${tokenUsage.costUSD.toFixed(2)}
            {tokenUsage.costAlert && (
              <span style={{
                fontSize: 12,
                opacity: 0.6,
                marginLeft: 8,
                fontWeight: 'normal',
              }}>
                / ${tokenUsage.costAlert.toFixed(2)}
              </span>
            )}
          </div>

          {/* Token breakdown bar */}
          <div style={{ marginBottom: 8 }}>
            <div style={{
              display: 'flex',
              height: 6,
              borderRadius: 3,
              overflow: 'hidden',
              background: '#1a1a2e',
            }}>
              {tokenUsage.totalTokens > 0 && (
                <>
                  <div
                    style={{
                      width: `${(tokenUsage.inputTokens / tokenUsage.totalTokens) * 100}%`,
                      background: '#4488ff',
                    }}
                    title={`Input: ${tokenUsage.inputTokens.toLocaleString()}`}
                  />
                  <div
                    style={{
                      width: `${(tokenUsage.outputTokens / tokenUsage.totalTokens) * 100}%`,
                      background: '#ff8844',
                    }}
                    title={`Output: ${tokenUsage.outputTokens.toLocaleString()}`}
                  />
                  <div
                    style={{
                      width: `${(tokenUsage.cacheReadTokens / tokenUsage.totalTokens) * 100}%`,
                      background: '#44ff88',
                    }}
                    title={`Cache Read: ${tokenUsage.cacheReadTokens.toLocaleString()}`}
                  />
                  <div
                    style={{
                      width: `${(tokenUsage.cacheCreationTokens / tokenUsage.totalTokens) * 100}%`,
                      background: '#aa44ff',
                    }}
                    title={`Cache Write: ${tokenUsage.cacheCreationTokens.toLocaleString()}`}
                  />
                </>
              )}
            </div>
          </div>

          {/* Legend */}
          <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '4px 10px',
            fontSize: 10,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#4488ff' }} />
              <span style={{ opacity: 0.8 }}>In {formatTokens(tokenUsage.inputTokens)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#ff8844' }} />
              <span style={{ opacity: 0.8 }}>Out {formatTokens(tokenUsage.outputTokens)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div style={{ width: 8, height: 8, borderRadius: 2, background: '#44ff88' }} />
              <span style={{ opacity: 0.8 }}>Cached {formatTokens(tokenUsage.cacheReadTokens)}</span>
            </div>
          </div>

          {/* Total */}
          <div style={{
            marginTop: 8,
            paddingTop: 8,
            borderTop: '1px solid rgba(255,255,255,0.1)',
            fontSize: 11,
            display: 'flex',
            justifyContent: 'space-between',
          }}>
            <span style={{ opacity: 0.6 }}>Total</span>
            <span>{formatTokens(tokenUsage.totalTokens)} tokens</span>
          </div>
        </div>

        {/* Event Log section */}
        <div style={{ ...sectionStyle, flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column', borderBottom: 'none' }}>
          <div style={{ fontSize: 11, opacity: 0.5, marginBottom: 8, letterSpacing: 1 }}>EVENT LOG</div>
          <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
            {recentEvents.length === 0 ? (
              <div style={{ opacity: 0.4, fontSize: 12 }}>Waiting for events...</div>
            ) : (
              recentEvents.map((event, i) => (
                <div
                  key={`${event.timestamp}-${i}`}
                  style={{
                    fontSize: 11,
                    padding: '3px 0',
                    borderBottom: '1px solid rgba(0, 255, 136, 0.08)',
                    opacity: 1 - i * 0.06,
                  }}
                >
                  <span style={{
                    color: event.type === 'file_write' ? '#ff8800'
                      : event.type === 'file_read' ? '#00ff88'
                      : '#8800ff',
                  }}>
                    [{event.type.toUpperCase()}]
                  </span>
                  {' '}
                  <span style={{ opacity: 0.7 }}>
                    {event.path?.split('/').slice(-2).join('/') || event.details}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Demo controls — only when not connected */}
        {!connected && (
          <div style={{ ...sectionStyle, borderBottom: 'none', flexShrink: 0 }}>
            <button
              onClick={isDemoRunning ? onStopDemo : onStartDemo}
              style={{
                background: isDemoRunning ? '#ff0044' : '#00ff88',
                border: 'none',
                color: isDemoRunning ? '#ffffff' : '#000000',
                padding: '10px 16px',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontWeight: 'bold',
                fontSize: 12,
                width: '100%',
              }}
            >
              {isDemoRunning ? 'STOP DEMO' : 'START DEMO'}
            </button>
          </div>
        )}
      </div>

      {/* Breadcrumb overlay — stays in viewport center, independent of sidebar */}
      {showBreadcrumb && onNavigateTo && onNavigateUp && (
        <div style={{
          position: 'absolute',
          top: 16,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
          pointerEvents: 'none',
          zIndex: 100,
          fontFamily: 'monospace',
          color: '#00ff88',
        }}>
          <div style={{
            background: 'rgba(10, 10, 18, 0.85)',
            border: '1px solid rgba(0, 255, 136, 0.3)',
            padding: '8px 16px',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto',
          }}>
            <span
              onClick={() => onNavigateTo(basePath)}
              style={{ cursor: 'pointer', opacity: 0.8 }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '1'
                e.currentTarget.style.textDecoration = 'underline'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '0.8'
                e.currentTarget.style.textDecoration = 'none'
              }}
            >
              {basePathName}
            </span>
            {segments.map((seg, i) => {
              const pathUpToSegment = basePath + '/' + segments.slice(0, i + 1).join('/')
              return (
                <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ opacity: 0.5 }}>/</span>
                  <span
                    onClick={() => onNavigateTo(pathUpToSegment)}
                    style={{
                      cursor: 'pointer',
                      opacity: i === segments.length - 1 ? 1 : 0.8,
                      fontWeight: i === segments.length - 1 ? 'bold' : 'normal',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.textDecoration = 'underline'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.textDecoration = 'none'
                    }}
                  >
                    {seg}
                  </span>
                </span>
              )
            })}
            <button
              onClick={onNavigateUp}
              style={{
                marginLeft: 8,
                padding: '4px 8px',
                background: 'transparent',
                border: '1px solid rgba(0, 255, 136, 0.5)',
                color: '#00ff88',
                borderRadius: 4,
                cursor: 'pointer',
                fontFamily: 'monospace',
                fontSize: 12,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = 'rgba(0, 255, 136, 0.2)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = 'transparent'
              }}
            >
              ↑ Up
            </button>
          </div>
        </div>
      )}
    </>
  )
}
