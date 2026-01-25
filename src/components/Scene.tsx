import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import { Suspense } from 'react'
import IsometricGrid from './IsometricGrid'
import Unit from './Unit'
import type { GridCell, Unit as UnitType } from '../types'

interface SceneProps {
  cells: GridCell[]
  exploredPaths: Set<string>
  units: UnitType[]
}

function SceneContent({ cells, exploredPaths, units }: SceneProps) {
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

      {/* Lighting - brighter for visibility */}
      <ambientLight intensity={0.7} />
      <directionalLight
        position={[10, 20, 5]}
        intensity={1.5}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={60}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <pointLight position={[-10, 8, -10]} intensity={0.8} color="#4488ff" />
      <pointLight position={[10, 6, 15]} intensity={0.6} color="#ff8844" />
      {/* Central fill light */}
      <pointLight position={[0, 5, 0]} intensity={0.5} color="#aabbff" />
      {/* Rim lights for depth */}
      <pointLight position={[-15, 3, 10]} intensity={0.4} color="#88ffaa" />
      <pointLight position={[15, 3, -10]} intensity={0.4} color="#ffaa88" />

      {/* Fog - pushed way back for maximum visibility */}
      <fog attach="fog" args={['#0a0a18', 40, 100]} />

      {/* Grid and buildings */}
      <IsometricGrid cells={cells} exploredPaths={exploredPaths} />

      {/* Units */}
      {units.map(unit => (
        <Unit key={unit.id} unit={unit} />
      ))}

{/* Agent base removed - agent floats above the grid */}
    </>
  )
}

export default function Scene({ cells, exploredPaths, units }: SceneProps) {
  return (
    <Canvas
      shadows
      gl={{ antialias: true }}
      style={{ background: '#0a0a12' }}
    >
      <Suspense fallback={null}>
        <SceneContent cells={cells} exploredPaths={exploredPaths} units={units} />
      </Suspense>
    </Canvas>
  )
}
