import { useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Unit as UnitType } from '../types'
import { gridToWorld } from './IsometricGrid'

interface UnitProps {
  unit: UnitType
}

export default function Unit({ unit }: UnitProps) {
  const groupRef = useRef<THREE.Group>(null)
  const screenRef = useRef<THREE.Mesh>(null)
  const startTime = useRef(Date.now())

  // Floating height above the grid
  const FLOAT_HEIGHT = 3

  // Animate position
  useFrame(() => {
    if (!groupRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000

    // Calculate target position above the file being accessed
    let targetX = 0
    let targetZ = 0

    if (unit.targetPosition) {
      const worldPos = gridToWorld(unit.targetPosition.x, unit.targetPosition.y, 0)
      targetX = worldPos[0]
      targetZ = worldPos[2]
    }

    // Smooth movement towards target
    const currentPos = groupRef.current.position
    const lerpSpeed = 0.03
    const newX = currentPos.x + (targetX - currentPos.x) * lerpSpeed
    const newZ = currentPos.z + (targetZ - currentPos.z) * lerpSpeed

    // Gentle floating motion
    const floatOffset = Math.sin(elapsed * 1.5) * 0.15
    const newY = FLOAT_HEIGHT + floatOffset

    groupRef.current.position.set(newX, newY, newZ)

    // Gentle rotation/tilt based on movement
    const moveX = targetX - currentPos.x
    const moveZ = targetZ - currentPos.z
    groupRef.current.rotation.z = -moveX * 0.02
    groupRef.current.rotation.x = moveZ * 0.02

    // Screen flicker effect when working
    if (screenRef.current) {
      const material = screenRef.current.material as THREE.MeshStandardMaterial
      if (unit.state === 'working') {
        material.emissiveIntensity = 1.5 + Math.sin(elapsed * 20) * 0.5
      } else {
        material.emissiveIntensity = 1.0 + Math.sin(elapsed * 3) * 0.2
      }
    }
  })

  // Screen color based on state
  const screenColor = unit.state === 'working' ? '#00ffaa' : '#00ff88'
  const frameColor = '#1a1a2a'

  return (
    <group ref={groupRef} position={[0, FLOAT_HEIGHT, 0]}>
      {/* Main monitor frame */}
      <mesh castShadow>
        <boxGeometry args={[1.8, 1.2, 0.15]} />
        <meshStandardMaterial
          color={frameColor}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Screen bezel */}
      <mesh position={[0, 0, 0.06]}>
        <boxGeometry args={[1.6, 1.0, 0.05]} />
        <meshStandardMaterial
          color="#0a0a15"
          roughness={0.5}
          metalness={0.5}
        />
      </mesh>

      {/* Screen display */}
      <mesh ref={screenRef} position={[0, 0, 0.09]}>
        <planeGeometry args={[1.4, 0.85]} />
        <meshStandardMaterial
          color={screenColor}
          emissive={screenColor}
          emissiveIntensity={1.2}
          roughness={0.1}
        />
      </mesh>

      {/* Screen scan line effect */}
      <mesh position={[0, 0, 0.095]}>
        <planeGeometry args={[1.4, 0.85]} />
        <meshStandardMaterial
          color="#000000"
          transparent
          opacity={0.1}
        />
      </mesh>

      {/* Monitor stand base (floating) */}
      <mesh position={[0, -0.75, 0]}>
        <cylinderGeometry args={[0.15, 0.2, 0.3, 8]} />
        <meshStandardMaterial
          color={frameColor}
          roughness={0.3}
          metalness={0.8}
        />
      </mesh>

      {/* Antenna */}
      <mesh position={[0.7, 0.7, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 0.3]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={0.8}
        />
      </mesh>

      {/* Antenna tip */}
      <mesh position={[0.7, 0.88, 0]}>
        <sphereGeometry args={[0.05, 8, 8]} />
        <meshStandardMaterial
          color="#00ff88"
          emissive="#00ff88"
          emissiveIntensity={1.5}
        />
      </mesh>

      {/* Status LED */}
      <mesh position={[-0.75, -0.5, 0.08]}>
        <sphereGeometry args={[0.04, 8, 8]} />
        <meshStandardMaterial
          color={unit.state === 'working' ? '#ff8800' : '#00ff88'}
          emissive={unit.state === 'working' ? '#ff8800' : '#00ff88'}
          emissiveIntensity={2}
        />
      </mesh>

      {/* Glow light from screen */}
      <pointLight
        position={[0, 0, 1]}
        intensity={unit.state === 'working' ? 3 : 1.5}
        distance={8}
        color={screenColor}
      />

      {/* Downward light beam when working */}
      {unit.state === 'working' && (
        <>
          <spotLight
            position={[0, -0.5, 0]}
            angle={0.3}
            penumbra={0.5}
            intensity={5}
            distance={10}
            color="#00ff88"
            target-position={[0, -10, 0]}
          />
          {/* Light beam visual */}
          <mesh position={[0, -3, 0]}>
            <cylinderGeometry args={[0.05, 0.8, 5, 8, 1, true]} />
            <meshStandardMaterial
              color="#00ff88"
              emissive="#00ff88"
              emissiveIntensity={0.5}
              transparent
              opacity={0.15}
              side={THREE.DoubleSide}
            />
          </mesh>
        </>
      )}
    </group>
  )
}
