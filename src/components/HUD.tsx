import type { AgentEvent } from '../types'
import type { TokenUsage } from '../hooks/useTokenUsage'

interface HUDProps {
  connected: boolean
  exploredCount: number
  totalCount: number
  eventHistory: AgentEvent[]
  onStartDemo: () => void
  onStopDemo: () => void
  isDemoRunning: boolean
  tokenUsage: TokenUsage
}

export default function HUD({
  connected,
  exploredCount,
  totalCount,
  eventHistory,
  onStartDemo,
  onStopDemo,
  isDemoRunning,
  tokenUsage,
}: HUDProps) {
  const recentEvents = eventHistory.slice(-8).reverse()
  const tokenUsagePercent = tokenUsage.tokensLimit > 0
    ? (tokenUsage.tokensUsed / tokenUsage.tokensLimit) * 100
    : 0

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

        {/* Center - Title */}
        <div style={{
          background: 'rgba(0, 0, 0, 0.7)',
          border: '1px solid #00ff88',
          padding: '12px 24px',
          borderRadius: 4,
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 18, fontWeight: 'bold', letterSpacing: 4 }}>CLAUDE RTS</div>
          <div style={{ fontSize: 10, opacity: 0.7, marginTop: 4 }}>AGENT COMMAND INTERFACE</div>
        </div>

        {/* Right - Resources */}
        <div style={{
          display: 'flex',
          gap: 12,
        }}>
          {/* Explored Files */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid #00ff88',
            padding: '12px 16px',
            borderRadius: 4,
          }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 4 }}>EXPLORED</div>
            <div style={{ fontSize: 20, fontWeight: 'bold' }}>
              {exploredCount} <span style={{ opacity: 0.5, fontSize: 14 }}>/ {totalCount}</span>
            </div>
            <div style={{
              marginTop: 8,
              height: 4,
              background: '#1a1a2e',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${totalCount > 0 ? (exploredCount / totalCount) * 100 : 0}%`,
                background: 'linear-gradient(90deg, #00ff88, #00aa55)',
                transition: 'width 0.3s ease',
              }} />
            </div>
          </div>

          {/* Token Usage */}
          <div style={{
            background: 'rgba(0, 0, 0, 0.7)',
            border: '1px solid #00ff88',
            padding: '12px 16px',
            borderRadius: 4,
            minWidth: 240,
          }}>
            <div style={{
              fontSize: 12,
              opacity: 0.7,
              marginBottom: 4,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}>
              <span>TOKEN USAGE</span>
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
            {/* Cost display */}
            <div style={{
              fontSize: 24,
              fontWeight: 'bold',
              color: tokenUsage.costUSD > 1 ? '#ff8800' : '#00ff88',
            }}>
              ${tokenUsage.costUSD.toFixed(4)}
            </div>
            {/* Token breakdown */}
            <div style={{
              marginTop: 8,
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '4px 12px',
              fontSize: 10,
            }}>
              <div style={{ opacity: 0.7 }}>
                <span style={{ color: '#4488ff' }}>IN:</span> {tokenUsage.inputTokens.toLocaleString()}
              </div>
              <div style={{ opacity: 0.7 }}>
                <span style={{ color: '#ff8844' }}>OUT:</span> {tokenUsage.outputTokens.toLocaleString()}
              </div>
              <div style={{ opacity: 0.7 }}>
                <span style={{ color: '#44ff88' }}>CACHE R:</span> {tokenUsage.cacheReadTokens.toLocaleString()}
              </div>
              <div style={{ opacity: 0.7 }}>
                <span style={{ color: '#ff44ff' }}>CACHE W:</span> {tokenUsage.cacheCreationTokens.toLocaleString()}
              </div>
            </div>
            {/* Total tokens bar */}
            <div style={{
              marginTop: 8,
              fontSize: 11,
              opacity: 0.9,
            }}>
              Total: {tokenUsage.totalTokens.toLocaleString()} tokens
            </div>
            <div style={{
              marginTop: 4,
              height: 4,
              background: '#1a1a2e',
              borderRadius: 2,
              overflow: 'hidden',
            }}>
              <div style={{
                height: '100%',
                width: `${Math.min(tokenUsagePercent, 100)}%`,
                background: tokenUsagePercent > 90
                  ? 'linear-gradient(90deg, #ff0044, #ff4400)'
                  : tokenUsagePercent > 70
                    ? 'linear-gradient(90deg, #ff8800, #ff4400)'
                    : 'linear-gradient(90deg, #00ff88, #00aa55)',
                transition: 'width 0.3s ease, background 0.3s ease',
              }} />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom left - Event log */}
      <div style={{
        position: 'absolute',
        bottom: 20,
        left: 20,
        width: 320,
        background: 'rgba(0, 0, 0, 0.7)',
        border: '1px solid #00ff88',
        padding: '12px 16px',
        borderRadius: 4,
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
      {/* <div style={{
        position: 'absolute',
        bottom: 20,
        right: 20,
        background: 'rgba(0, 0, 0, 0.7)',
        border: '1px solid #00ff88',
        padding: '12px 16px',
        borderRadius: 4,
        pointerEvents: 'auto',
      }}>
        <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 8 }}>CONTROLS</div>
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
          }}
        >
          {isDemoRunning ? 'STOP DEMO' : 'START DEMO'}
        </button>
        <div style={{ fontSize: 10, opacity: 0.5, marginTop: 8 }}>
          Drag to rotate • Scroll to zoom
        </div>
      </div> */}
    </div>
  )
}
