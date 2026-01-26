import { useEffect, useCallback, useState, useRef, useMemo } from 'react'
import Scene from './components/Scene'
import HUD from './components/HUD'
import FileModal from './components/FileModal'
import ContextMenu from './components/ContextMenu'
import Terminal from './components/Terminal'
import { useCodebaseState } from './hooks/useCodebaseState'
import { useEventStream, useDemoEventStream } from './hooks/useEventStream'
import { useUnits } from './hooks/useUnits'
import { useTokenUsage } from './hooks/useTokenUsage'
import { useTerminalStore } from './stores/terminalStore'
import type { AgentEvent, GridCell } from './types'

const FILE_API_URL = 'http://localhost:8766'

interface FileEntry {
  path: string
  type: 'file' | 'directory'
}

// Fallback demo files when server isn't providing real structure
const DEMO_FILES: FileEntry[] = [
  { path: '/project/src', type: 'directory' },
  { path: '/project/src/index.ts', type: 'file' },
  { path: '/project/src/App.tsx', type: 'file' },
  { path: '/project/src/main.tsx', type: 'file' },
  { path: '/project/src/types.ts', type: 'file' },
  { path: '/project/src/components', type: 'directory' },
  { path: '/project/src/components/Header.tsx', type: 'file' },
  { path: '/project/src/components/Footer.tsx', type: 'file' },
  { path: '/project/src/components/Button.tsx', type: 'file' },
  { path: '/project/src/components/Modal.tsx', type: 'file' },
  { path: '/project/src/components/Card.tsx', type: 'file' },
  { path: '/project/src/hooks', type: 'directory' },
  { path: '/project/src/hooks/useAuth.ts', type: 'file' },
  { path: '/project/src/hooks/useApi.ts', type: 'file' },
  { path: '/project/src/hooks/useState.ts', type: 'file' },
  { path: '/project/src/utils', type: 'directory' },
  { path: '/project/src/utils/format.ts', type: 'file' },
  { path: '/project/src/utils/helpers.ts', type: 'file' },
  { path: '/project/src/utils/validate.ts', type: 'file' },
  { path: '/project/src/api', type: 'directory' },
  { path: '/project/src/api/client.ts', type: 'file' },
  { path: '/project/src/api/endpoints.ts', type: 'file' },
  { path: '/project/src/styles', type: 'directory' },
  { path: '/project/src/styles/main.css', type: 'file' },
  { path: '/project/src/styles/components.css', type: 'file' },
  { path: '/project/package.json', type: 'file' },
  { path: '/project/tsconfig.json', type: 'file' },
  { path: '/project/vite.config.ts', type: 'file' },
  { path: '/project/README.md', type: 'file' },
]

const WS_URL = 'ws://localhost:8765'

function App() {
  const [wsConnected, setWsConnected] = useState(false)
  const [basePath, setBasePath] = useState('/project')
  const [fileEntries, setFileEntries] = useState<FileEntry[]>(DEMO_FILES)
  const initializedRef = useRef(false)

  // File modal state
  const [selectedFile, setSelectedFile] = useState<string | null>(null)
  const [fileContent, setFileContent] = useState<string | null>(null)
  const [fileLoading, setFileLoading] = useState(false)
  const [fileError, setFileError] = useState<string | null>(null)

  // Hidden directories state
  const [hiddenPaths, setHiddenPaths] = useState<Set<string>>(new Set())

  // Context menu state
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    path: string
    isDirectory: boolean
  } | null>(null)

  // Terminal state
  const [showTerminal, setShowTerminal] = useState(false)
  const { terminalId, setTerminalId } = useTerminalStore()

  const {
    grid,
    exploredPaths,
    initializeCodebase,
    handleEvent: handleCodebaseEvent,
    getCellByPath,
  } = useCodebaseState(basePath)

  const { units, handleEvent: handleUnitEvent } = useUnits(getCellByPath)

  const { tokenUsage, handleEvent: handleTokenEvent, fetchUsage, setAlertThreshold } = useTokenUsage()

  // Filter grid to hide children of hidden directories
  const filteredGrid = useMemo(() => {
    if (hiddenPaths.size === 0) return grid

    return grid.filter((cell: GridCell) => {
      if (!cell.node?.path) return true

      // Check if any hidden path is a parent of this cell
      for (const hiddenPath of hiddenPaths) {
        if (cell.node.path.startsWith(hiddenPath + '/')) {
          return false
        }
      }
      return true
    })
  }, [grid, hiddenPaths])

  // Handle right-click on node
  const handleContextMenu = useCallback((e: { x: number; y: number; path: string; isDirectory: boolean }) => {
    setContextMenu(e)
  }, [])

  // Hide a directory's contents
  const handleHidePath = useCallback((path: string) => {
    setHiddenPaths(prev => new Set([...prev, path]))
  }, [])

  // Show a directory's contents
  const handleShowPath = useCallback((path: string) => {
    setHiddenPaths(prev => {
      const next = new Set(prev)
      next.delete(path)
      return next
    })
  }, [])

  // Handle events from WebSocket
  const handleEvent = useCallback((event: AgentEvent & { basePath?: string; files?: FileEntry[] }) => {
    // Handle init event with file structure from server
    if (event.type === 'init' && event.files && event.basePath) {
      console.log('[App] Received file structure:', event.files.length, 'entries from', event.basePath)
      setBasePath(event.basePath)
      setFileEntries(event.files)
      initializedRef.current = false // Trigger re-initialization
      return
    }

    // Handle regular events
    handleCodebaseEvent(event)
    handleUnitEvent(event)
    handleTokenEvent(event)
  }, [handleCodebaseEvent, handleUnitEvent, handleTokenEvent])

  // WebSocket connection for real events
  const { eventHistory } = useEventStream({
    url: WS_URL,
    onEvent: handleEvent,
    onConnect: () => {
      setWsConnected(true)
      // Fetch initial usage data when connected
      fetchUsage()
    },
    onDisconnect: () => setWsConnected(false),
  })

  // Demo mode - uses current file paths
  const filePaths = fileEntries.map(e => e.path)
  const demoStream = useDemoEventStream(handleEvent, filePaths)

  // Initialize/reinitialize codebase when entries change
  useEffect(() => {
    if (!initializedRef.current || fileEntries !== DEMO_FILES) {
      console.log('[App] Initializing codebase with', fileEntries.length, 'entries, basePath:', basePath)
      const largeDirs = initializeCodebase(fileEntries)

      // Auto-hide directories with 100+ items
      if (largeDirs.length > 0) {
        console.log('[App] Auto-hiding large directories:', largeDirs)
        setHiddenPaths(new Set(largeDirs))
      }

      initializedRef.current = true
    }
  }, [fileEntries, basePath, initializeCodebase])

  // Handle file click - fetch content and show modal
  const handleFileClick = useCallback(async (path: string) => {
    setSelectedFile(path)
    setFileContent(null)
    setFileError(null)
    setFileLoading(true)

    try {
      const response = await fetch(`${FILE_API_URL}/file?path=${encodeURIComponent(path)}`)
      const data = await response.json()

      if (!response.ok) {
        setFileError(data.error || 'Failed to load file')
      } else {
        setFileContent(data.content)
      }
    } catch (err) {
      setFileError('Failed to connect to server')
    } finally {
      setFileLoading(false)
    }
  }, [])

  // Close file modal
  const handleCloseModal = useCallback(() => {
    setSelectedFile(null)
    setFileContent(null)
    setFileError(null)
  }, [])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <div style={{ flex: showTerminal ? '1 1 60%' : '1 1 100%', position: 'relative', minHeight: 0 }}>
        <Scene
          cells={filteredGrid}
          exploredPaths={exploredPaths}
          units={units}
          hiddenPaths={hiddenPaths}
          onFileClick={handleFileClick}
          onContextMenu={handleContextMenu}
        />
      </div>

      {/* Terminal Panel */}
      {showTerminal && (
        <div
          style={{ flex: '0 0 40%', minHeight: 200, maxHeight: '50vh' }}
          onKeyDown={(e) => e.stopPropagation()}
          onKeyUp={(e) => e.stopPropagation()}
          onKeyPress={(e) => e.stopPropagation()}
        >
          <Terminal
            cwd={basePath}
            visible={showTerminal}
            terminalId={terminalId}
            onTerminalIdChange={setTerminalId}
            onClose={() => setShowTerminal(false)}
          />
        </div>
      )}

      {/* Terminal Toggle Button */}
      <button
        onClick={() => setShowTerminal(!showTerminal)}
        style={{
          position: 'fixed',
          bottom: showTerminal ? 'calc(40% + 10px)' : 10,
          right: 10,
          padding: '8px 16px',
          background: showTerminal ? '#00ff88' : 'rgba(20, 25, 35, 0.95)',
          color: showTerminal ? '#0a0a12' : '#00ff88',
          border: '1px solid #00ff88',
          borderRadius: 6,
          cursor: 'pointer',
          fontFamily: 'system-ui',
          fontSize: 13,
          fontWeight: 500,
          zIndex: 100,
          transition: 'all 0.2s',
        }}
      >
        {showTerminal ? 'Hide Terminal' : 'Terminal'}
      </button>

      <HUD
        connected={wsConnected}
        totalCount={grid.length}
        eventHistory={eventHistory}
        onStartDemo={demoStream.start}
        onStopDemo={demoStream.stop}
        isDemoRunning={demoStream.isRunning}
        tokenUsage={tokenUsage}
        onSetCostAlert={setAlertThreshold}
        terminalOpen={showTerminal}
      />
      {selectedFile && (
        <FileModal
          path={selectedFile}
          content={fileContent}
          loading={fileLoading}
          error={fileError}
          onClose={handleCloseModal}
        />
      )}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          path={contextMenu.path}
          isDirectory={contextMenu.isDirectory}
          isHidden={hiddenPaths.has(contextMenu.path)}
          onHide={() => handleHidePath(contextMenu.path)}
          onShow={() => handleShowPath(contextMenu.path)}
          onClose={() => setContextMenu(null)}
        />
      )}
    </div>
  )
}

export default App
