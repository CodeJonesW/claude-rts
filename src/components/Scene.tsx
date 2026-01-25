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

      {/* Lighting */}
      <ambientLight intensity={0.3} />
      <directionalLight
        position={[10, 15, 5]}
        intensity={1}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-far={50}
        shadow-camera-left={-20}
        shadow-camera-right={20}
        shadow-camera-top={20}
        shadow-camera-bottom={-20}
      />
      <pointLight position={[-5, 5, -5]} intensity={0.5} color="#4488ff" />
      <pointLight position={[5, 3, 10]} intensity={0.3} color="#ff8844" />

      {/* Fog */}
      <fog attach="fog" args={['#0a0a12', 15, 40]} />

      {/* Grid and buildings */}
      <IsometricGrid cells={cells} exploredPaths={exploredPaths} />

      {/* Units */}
      {units.map(unit => (
        <Unit key={unit.id} unit={unit} />
      ))}

      {/* Base station at origin */}
      <group position={[0, 0, 0]}>
        {/* Platform */}
        <mesh position={[0, 0.05, 0]} receiveShadow>
          <cylinderGeometry args={[0.5, 0.6, 0.1, 8]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={0.3}
            roughness={0.5}
            metalness={0.8}
          />
        </mesh>
        {/* Central spire */}
        <mesh position={[0, 0.4, 0]} castShadow>
          <cylinderGeometry args={[0.08, 0.15, 0.7, 6]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={0.5}
            roughness={0.3}
            metalness={0.9}
          />
        </mesh>
        {/* Beacon light */}
        <pointLight
          position={[0, 0.8, 0]}
          intensity={2}
          distance={3}
          color="#00ff88"
        />
      </group>
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
