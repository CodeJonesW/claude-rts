import { useEffect, useCallback, useState, useRef } from 'react'
import Scene from './components/Scene'
import HUD from './components/HUD'
import { useCodebaseState } from './hooks/useCodebaseState'
import { useEventStream, useDemoEventStream } from './hooks/useEventStream'
import { useUnits } from './hooks/useUnits'
import { useTokenUsage } from './hooks/useTokenUsage'
import type { AgentEvent } from './types'

// Fallback demo files when server isn't providing real structure
const DEMO_FILES = [
  '/project/src/index.ts',
  '/project/src/App.tsx',
  '/project/src/main.tsx',
  '/project/src/types.ts',
  '/project/src/components/Header.tsx',
  '/project/src/components/Footer.tsx',
  '/project/src/components/Button.tsx',
  '/project/src/components/Modal.tsx',
  '/project/src/components/Card.tsx',
  '/project/src/hooks/useAuth.ts',
  '/project/src/hooks/useApi.ts',
  '/project/src/hooks/useState.ts',
  '/project/src/utils/format.ts',
  '/project/src/utils/helpers.ts',
  '/project/src/utils/validate.ts',
  '/project/src/api/client.ts',
  '/project/src/api/endpoints.ts',
  '/project/src/styles/main.css',
  '/project/src/styles/components.css',
  '/project/package.json',
  '/project/tsconfig.json',
  '/project/vite.config.ts',
  '/project/README.md',
]

const WS_URL = 'ws://localhost:8765'

function App() {
  const [wsConnected, setWsConnected] = useState(false)
  const [basePath, setBasePath] = useState('/project')
  const [filePaths, setFilePaths] = useState<string[]>(DEMO_FILES)
  const initializedRef = useRef(false)

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
  const handleEvent = useCallback((event: AgentEvent & { basePath?: string; files?: string[] }) => {
    // Handle init event with file structure from server
    if (event.type === 'init' && event.files && event.basePath) {
      console.log('[App] Received file structure:', event.files.length, 'files from', event.basePath)
      setBasePath(event.basePath)
      setFilePaths(event.files)
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
  const demoStream = useDemoEventStream(handleEvent, filePaths)

  // Initialize/reinitialize codebase when paths change
  useEffect(() => {
    if (!initializedRef.current || filePaths !== DEMO_FILES) {
      console.log('[App] Initializing codebase with', filePaths.length, 'files, basePath:', basePath)
      initializeCodebase(filePaths)
      initializedRef.current = true
    }
  }, [filePaths, basePath, initializeCodebase])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      <Scene
        cells={grid}
        exploredPaths={exploredPaths}
        units={units}
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
    </div>
  )
}

export default App
