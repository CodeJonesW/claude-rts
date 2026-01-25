import { useEffect, useRef } from 'react'
import { Highlight, themes } from 'prism-react-renderer'

interface FileModalProps {
  path: string
  content: string | null
  loading: boolean
  error: string | null
  onClose: () => void
}

// Get language from file extension for syntax highlighting
function getLanguage(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return 'tsx'
    case 'js':
    case 'jsx':
      return 'jsx'
    case 'json':
      return 'json'
    case 'css':
      return 'css'
    case 'scss':
      return 'scss'
    case 'html':
      return 'markup'
    case 'md':
      return 'markdown'
    case 'py':
      return 'python'
    case 'sh':
    case 'bash':
      return 'bash'
    case 'yml':
    case 'yaml':
      return 'yaml'
    case 'go':
      return 'go'
    case 'rs':
      return 'rust'
    case 'sql':
      return 'sql'
    case 'graphql':
    case 'gql':
      return 'graphql'
    default:
      return 'typescript' // Default fallback
  }
}

// Get display name for language badge
function getLanguageDisplay(path: string): string {
  const ext = path.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
      return 'TypeScript'
    case 'tsx':
      return 'TSX'
    case 'js':
      return 'JavaScript'
    case 'jsx':
      return 'JSX'
    case 'json':
      return 'JSON'
    case 'css':
      return 'CSS'
    case 'scss':
      return 'SCSS'
    case 'html':
      return 'HTML'
    case 'md':
      return 'Markdown'
    case 'py':
      return 'Python'
    case 'sh':
    case 'bash':
      return 'Shell'
    case 'yml':
    case 'yaml':
      return 'YAML'
    case 'go':
      return 'Go'
    case 'rs':
      return 'Rust'
    default:
      return ext?.toUpperCase() || 'Text'
  }
}

export default function FileModal({ path, content, loading, error, onClose }: FileModalProps) {
  const modalRef = useRef<HTMLDivElement>(null)

  // Close on escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [onClose])

  // Close on click outside
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose()
    }
  }

  const fileName = path.split('/').pop() || path
  const language = getLanguage(path)
  const languageDisplay = getLanguageDisplay(path)

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.85)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px',
      }}
    >
      <div
        ref={modalRef}
        style={{
          backgroundColor: '#1a1a2e',
          borderRadius: '12px',
          border: '1px solid #00ff88',
          boxShadow: '0 0 30px rgba(0, 255, 136, 0.3)',
          maxWidth: '1000px',
          maxHeight: '85vh',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 20px',
            borderBottom: '1px solid #2a2a4e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            backgroundColor: '#12121e',
          }}
        >
          <div>
            <div style={{ color: '#00ff88', fontSize: '16px', fontWeight: 'bold' }}>
              {fileName}
            </div>
            <div style={{ color: '#666', fontSize: '12px', marginTop: '4px', fontFamily: 'monospace' }}>
              {path}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span
              style={{
                padding: '4px 10px',
                backgroundColor: '#2a2a4e',
                borderRadius: '4px',
                color: '#00ff88',
                fontSize: '11px',
                fontWeight: 'bold',
              }}
            >
              {languageDisplay}
            </span>
            <button
              onClick={onClose}
              style={{
                background: 'none',
                border: 'none',
                color: '#666',
                fontSize: '24px',
                cursor: 'pointer',
                padding: '4px 8px',
                lineHeight: 1,
              }}
              onMouseOver={(e) => (e.currentTarget.style.color = '#ff4444')}
              onMouseOut={(e) => (e.currentTarget.style.color = '#666')}
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            overflow: 'auto',
            backgroundColor: '#0d0d14',
          }}
        >
          {loading && (
            <div style={{ color: '#00ff88', textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⟳</div>
              Loading...
            </div>
          )}

          {error && (
            <div style={{ color: '#ff4444', textAlign: 'center', padding: '40px' }}>
              <div style={{ fontSize: '24px', marginBottom: '10px' }}>⚠</div>
              {error}
            </div>
          )}

          {content !== null && !loading && !error && (
            <Highlight
              theme={themes.nightOwl}
              code={content}
              language={language}
            >
              {({ style, tokens, getLineProps, getTokenProps }) => (
                <pre
                  style={{
                    ...style,
                    margin: 0,
                    padding: '16px 0',
                    backgroundColor: 'transparent',
                    fontFamily: 'Monaco, Consolas, "Courier New", monospace',
                    fontSize: '13px',
                    lineHeight: '1.6',
                    overflowX: 'auto',
                  }}
                >
                  {tokens.map((line, i) => (
                    <div
                      key={i}
                      {...getLineProps({ line })}
                      style={{
                        display: 'flex',
                        minHeight: '1.6em',
                      }}
                    >
                      <span
                        style={{
                          display: 'inline-block',
                          width: '50px',
                          paddingRight: '16px',
                          textAlign: 'right',
                          color: '#4a5568',
                          userSelect: 'none',
                          flexShrink: 0,
                          fontSize: '12px',
                        }}
                      >
                        {i + 1}
                      </span>
                      <span style={{ paddingRight: '20px' }}>
                        {line.map((token, key) => (
                          <span key={key} {...getTokenProps({ token })} />
                        ))}
                      </span>
                    </div>
                  ))}
                </pre>
              )}
            </Highlight>
          )}
        </div>

        {/* Footer */}
        <div
          style={{
            padding: '12px 20px',
            borderTop: '1px solid #2a2a4e',
            backgroundColor: '#12121e',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: '#666', fontSize: '12px' }}>
            {content ? `${content.split('\n').length} lines` : ''}
          </span>
          <span style={{ color: '#444', fontSize: '11px' }}>
            Press ESC to close
          </span>
        </div>
      </div>
    </div>
  )
}
