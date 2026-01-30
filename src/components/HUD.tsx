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
}

export default function HUD({
  connected,
  totalCount,
  eventHistory,
  onStartDemo,
  onStopDemo,
  isDemoRunning,
  tokenUsage,
  terminalOpen = false,
  viewRoot,
  basePath,
  onNavigateTo,
  onNavigateUp,
}: HUDProps) {
  const recentEvents = eventHistory.slice(-8).reverse()

  // Compute breadcrumb segments
  const showBreadcrumb = viewRoot && basePath && viewRoot !== basePath
  const basePathName = basePath?.split('/').pop() || 'root'
  const relativePath = showBreadcrumb ? viewRoot.replace(basePath + '/', '') : ''
  const segments = relativePath ? relativePath.split('/') : []

  return (
    <div style={{
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      pointerEvents: 'none',
      fontFamily: 'monospace',
      color: '#00ff88',
    }}>
      {/* Top bar - Status */}
      <div style={{
        position: 'absolute',
        top: 20,
        left: 20,
        right: 20,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
      }}>
        {/* Left - Connection status */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid #00ff88',
          padding: '12px 16px',
          borderRadius: 4,
        }}>
          <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>STATUS</div>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}>
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
            <span>{connected ? 'CONNECTED' : isDemoRunning ? 'DEMO MODE' : 'DISCONNECTED'}</span>
          </div>
        </div>

        {/* Center - Breadcrumb Navigation */}
        {showBreadcrumb && onNavigateTo && onNavigateUp && (
          <div style={{
            background: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid #00ff88',
            padding: '8px 16px',
            borderRadius: 4,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            pointerEvents: 'auto',
          }}>
            <span
              onClick={() => onNavigateTo(basePath)}
              style={{
                cursor: 'pointer',
                opacity: 0.8,
              }}
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
        )}

        {/* Right - Resources */}
        <div style={{
          display: 'flex',
          gap: 12,
        }}>
          {/* File Count */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid #00ff88',
            padding: '4px 4px',
            borderRadius: 4,
          }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>FILES</div>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>
              {totalCount}
            </div>
          </div>

          {/* Token Usage - Redesigned */}
          <div style={{
            background: tokenUsage.isOverBudget
              ? 'rgba(255, 0, 68, 0.2)'
              : 'rgba(0, 0, 0, 0.7)',
            border: `1px solid ${tokenUsage.isOverBudget ? '#ff0044' : '#00ff88'}`,
            padding: '12px 16px',
            borderRadius: 4,
            minWidth: 200,
          }}>
            {/* Header */}
            <div style={{
              fontSize: 12,
              opacity: 0.7,
              marginBottom: 8,
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
                    animation: 'pulse 1s infinite',
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

            {/* Token breakdown - visual bar */}
            <div style={{ marginBottom: 8 }}>
              <div style={{
                display: 'flex',
                height: 8,
                borderRadius: 4,
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
              gap: '6px 12px',
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
        </div>
      </div>

      {/* Bottom left - Event log */}
      <div style={{
        position: 'absolute',
        bottom: terminalOpen ? 'calc(40% + 20px)' : 20,
        left: 20,
        width: 320,
        background: 'rgba(0, 0, 0, 0.7)',
        border: '1px solid #00ff88',
        padding: '12px 16px',
        borderRadius: 4,
        transition: 'bottom 0.2s ease-out',
      }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>EVENT LOG</div>
        <div style={{ maxHeight: 200, overflow: 'hidden' }}>
          {recentEvents.length === 0 ? (
            <div style={{ opacity: 0.5, fontSize: 12 }}>Waiting for events...</div>
          ) : (
            recentEvents.map((event, i) => (
              <div
                key={`${event.timestamp}-${i}`}
                style={{
                  fontSize: 11,
                  padding: '4px 0',
                  borderBottom: '1px solid rgba(0, 255, 136, 0.1)',
                  opacity: 1 - i * 0.1,
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

      {/* Bottom right - Controls */}
              {/* Demo button - only show when not connected */}
      {!connected && (
      <div style={{
        position: 'absolute',
        bottom: terminalOpen ? 'calc(40% + 20px)' : 20,
        right: 20,
        background: 'rgba(0, 0, 0, 0.7)',
        border: '1px solid #00ff88',
        padding: '12px 16px',
        borderRadius: 4,
        pointerEvents: 'auto',
        minWidth: 180,
        transition: 'bottom 0.2s ease-out',
      }}>


          <button
            onClick={isDemoRunning ? onStopDemo : onStartDemo}
            style={{
              background: isDemoRunning ? '#ff0044' : '#00ff88',
              border: 'none',
              color: isDemoRunning ? '#ffffff' : '#000000',
              padding: '8px 16px',
              borderRadius: 4,
              cursor: 'pointer',
              fontFamily: 'monospace',
              fontWeight: 'bold',
              fontSize: 12,
              width: '100%',
              marginBottom: 12,
            }}
          >
            {isDemoRunning ? 'STOP DEMO' : 'START DEMO'}
          </button>


      </div>        
    )}
    </div>
  )
}
