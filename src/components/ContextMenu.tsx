import { useEffect, useRef } from 'react'

interface ContextMenuProps {
  x: number
  y: number
  path: string
  isDirectory: boolean
  isHidden: boolean
  canNavigateUp: boolean
  onHide: () => void
  onShow: () => void
  onNavigateInto: () => void
  onNavigateUp: () => void
  onClose: () => void
}

export default function ContextMenu({
  x,
  y,
  path,
  isDirectory,
  isHidden,
  canNavigateUp,
  onHide,
  onShow,
  onNavigateInto,
  onNavigateUp,
  onClose,
}: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  // Close on click outside
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose()
      }
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    document.addEventListener('mousedown', handleClick)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleClick)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [onClose])

  const fileName = path.split('/').pop() || path

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: x,
        top: y,
        background: 'rgba(20, 25, 35, 0.95)',
        border: '1px solid rgba(100, 150, 255, 0.3)',
        borderRadius: 6,
        padding: '4px 0',
        minWidth: 160,
        boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)',
        zIndex: 1000,
        fontFamily: 'system-ui, -apple-system, sans-serif',
        fontSize: 13,
      }}
    >
      <div
        style={{
          padding: '6px 12px',
          color: '#8899aa',
          fontSize: 11,
          borderBottom: '1px solid rgba(100, 150, 255, 0.2)',
          marginBottom: 4,
          whiteSpace: 'nowrap',
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          maxWidth: 200,
        }}
        title={path}
      >
        {fileName}
      </div>

      {/* Navigate Into - directories only */}
      {isDirectory && (
        <button
          onClick={() => {
            onNavigateInto()
            onClose()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            color: '#ddeeff',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 13,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(100, 150, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span style={{ fontSize: 14 }}>→</span>
          Navigate into
        </button>
      )}

      {/* Navigate Up - when not at root */}
      {canNavigateUp && (
        <button
          onClick={() => {
            onNavigateUp()
            onClose()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            color: '#ddeeff',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 13,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(100, 150, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span style={{ fontSize: 14 }}>↑</span>
          Navigate up
        </button>
      )}

      {isDirectory && (
        <button
          onClick={() => {
            if (isHidden) {
              onShow()
            } else {
              onHide()
            }
            onClose()
          }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: '100%',
            padding: '8px 12px',
            background: 'transparent',
            border: 'none',
            color: '#ddeeff',
            cursor: 'pointer',
            textAlign: 'left',
            fontSize: 13,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(100, 150, 255, 0.2)'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'transparent'
          }}
        >
          <span style={{ fontSize: 14 }}>{isHidden ? '▶' : '▼'}</span>
          {isHidden ? 'Show contents' : 'Hide contents'}
        </button>
      )}
    </div>
  )
}
