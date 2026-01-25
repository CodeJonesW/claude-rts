import { useEffect, useCallback, useState, useRef } from 'react'
import Scene from './components/Scene'
import HUD from './components/HUD'
import FileModal from './components/FileModal'
import { useCodebaseState } from './hooks/useCodebaseState'
import { useEventStream, useDemoEventStream } from './hooks/useEventStream'
import { useUnits } from './hooks/useUnits'
import { useTokenUsage } from './hooks/useTokenUsage'
import type { AgentEvent } from './types'

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

  const {
    grid,
    exploredPaths,
    initializeCodebase,
    handleEvent: handleCodebaseEvent,
    getCellByPath,
  } = useCodebaseState(basePath)

  const { units, handleEvent: handleUnitEvent } = useUnits(getCellByPath)

  const { tokenUsage, handleEvent: handleTokenEvent, fetchUsage } = useTokenUsage()

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
      initializeCodebase(fileEntries)
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
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Scene
        cells={grid}
        exploredPaths={exploredPaths}
        units={units}
        onFileClick={handleFileClick}
      />
      <HUD
        connected={wsConnected}
        exploredCount={exploredPaths.size}
        totalCount={grid.length}
        eventHistory={eventHistory}
        onStartDemo={demoStream.start}
        onStopDemo={demoStream.stop}
        isDemoRunning={demoStream.isRunning}
        tokenUsage={tokenUsage}
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
    </div>
  )
}

export default App
