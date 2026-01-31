import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Suspense } from 'react'
import IsometricGrid from './IsometricGrid'
import { UnitWithEffects } from './Unit'
import type { GridCell, Unit as UnitType } from '../types'

interface SceneProps {
  cells: GridCell[]
  exploredPaths: Set<string>
  units: UnitType[]
  hiddenPaths?: Set<string>
  onFileClick?: (path: string) => void
  onContextMenu?: (e: { x: number; y: number; path: string; isDirectory: boolean }) => void
}

function SceneContent({ cells, exploredPaths, units, hiddenPaths, onFileClick, onContextMenu }: SceneProps) {
  return (
    <>
      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={[12, 14, 12]}
        fov={50}
      />

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={80}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        target={[0, 0, 0]}
      />

      {/* Lighting - simplified for performance */}
      <ambientLight intensity={0.8} />
      <directionalLight
        position={[10, 20, 5]}
        intensity={1.8}
        castShadow
        shadow-mapSize-width={1024}
        shadow-mapSize-height={1024}
        shadow-camera-far={50}
        shadow-camera-left={-25}
        shadow-camera-right={25}
        shadow-camera-top={25}
        shadow-camera-bottom={-25}
      />
      {/* Two hemisphere lights for even fill instead of many point lights */}
      <hemisphereLight intensity={0.4} color="#aabbff" groundColor="#332244" />

      {/* Fog - pushed way back for maximum visibility */}
      <fog attach="fog" args={['#0a0a18', 40, 100]} />

      {/* Grid and buildings */}
      <IsometricGrid
        cells={cells}
        exploredPaths={exploredPaths}
        hiddenPaths={hiddenPaths}
        onFileClick={onFileClick}
        onContextMenu={onContextMenu}
      />

      {/* Units */}
      {units.map(unit => (
        <UnitWithEffects key={unit.id} unit={unit} />
      ))}

{/* Agent base removed - agent floats above the grid */}
    </>
  )
}

export default function Scene({ cells, exploredPaths, units, hiddenPaths, onFileClick, onContextMenu }: SceneProps) {
  return (
    <Canvas
      shadows
      gl={{ antialias: true }}
      style={{ background: '#0a0a12' }}
      onContextMenu={(e) => e.preventDefault()}
    >
      <Suspense fallback={null}>
        <SceneContent
          cells={cells}
          exploredPaths={exploredPaths}
          units={units}
          hiddenPaths={hiddenPaths}
          onFileClick={onFileClick}
          onContextMenu={onContextMenu}
        />
      </Suspense>
    </Canvas>
  )
}
