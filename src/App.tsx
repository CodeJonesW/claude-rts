import { useEffect, useCallback, useState } from 'react'
import Scene from './components/Scene'
import HUD from './components/HUD'
import { useCodebaseState } from './hooks/useCodebaseState'
import { useEventStream, useDemoEventStream } from './hooks/useEventStream'
import { useUnits } from './hooks/useUnits'
import type { AgentEvent } from './types'

// Sample file paths for demo mode - simulates a typical project structure
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

  const {
    grid,
    exploredPaths,
    initializeCodebase,
    handleEvent: handleCodebaseEvent,
    getCellByPath,
  } = useCodebaseState('/project')

  const { units, handleEvent: handleUnitEvent } = useUnits(getCellByPath)

  // Combined event handler
  const handleEvent = useCallback((event: AgentEvent) => {
    handleCodebaseEvent(event)
    handleUnitEvent(event)
  }, [handleCodebaseEvent, handleUnitEvent])

  // WebSocket connection for real events
  const { eventHistory } = useEventStream({
    url: WS_URL,
    onEvent: handleEvent,
    onConnect: () => setWsConnected(true),
    onDisconnect: () => setWsConnected(false),
  })

  // Demo mode
  const demoStream = useDemoEventStream(handleEvent, DEMO_FILES)

  // Initialize codebase on mount
  useEffect(() => {
    initializeCodebase(DEMO_FILES)
  }, [initializeCodebase])

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
      />
    </div>
  )
}

export default App
