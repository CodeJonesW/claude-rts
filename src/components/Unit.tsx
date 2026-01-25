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

  // Animate position - throttled to reduce CPU load
  const lastUpdateRef = useRef(0)

  useFrame(() => {
    if (!groupRef.current) return

    const now = Date.now()
    const elapsed = (now - startTime.current) / 1000

    // Throttle position updates to ~30fps
    const shouldUpdatePosition = now - lastUpdateRef.current > 33

    if (shouldUpdatePosition) {
      lastUpdateRef.current = now

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
      const lerpSpeed = 0.05 // Slightly faster to compensate for lower update rate
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
    }

    // Screen flicker effect - can run less frequently too
    if (screenRef.current && shouldUpdatePosition) {
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

      {/* Little alien on screen */}
      <group position={[0, -0.05, 0.12]}>
        {/* Alien head */}
        <mesh position={[0, 0.12, 0]}>
          <sphereGeometry args={[0.15, 12, 10]} />
          <meshStandardMaterial
            color="#44ff88"
            emissive="#22cc66"
            emissiveIntensity={0.4}
            roughness={0.6}
          />
        </mesh>

        {/* Left eye */}
        <mesh position={[-0.07, 0.14, 0.1]}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial
            color="#111111"
            emissive="#000000"
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        {/* Left eye shine */}
        <mesh position={[-0.05, 0.16, 0.14]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Right eye */}
        <mesh position={[0.07, 0.14, 0.1]}>
          <sphereGeometry args={[0.055, 8, 8]} />
          <meshStandardMaterial
            color="#111111"
            emissive="#000000"
            roughness={0.2}
            metalness={0.8}
          />
        </mesh>
        {/* Right eye shine */}
        <mesh position={[0.09, 0.16, 0.14]}>
          <sphereGeometry args={[0.015, 6, 6]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#ffffff"
            emissiveIntensity={0.5}
          />
        </mesh>

        {/* Left antenna */}
        <mesh position={[-0.08, 0.28, 0]} rotation={[0, 0, 0.3]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12]} />
          <meshStandardMaterial
            color="#44ff88"
            emissive="#22cc66"
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* Left antenna bobble */}
        <mesh position={[-0.11, 0.33, 0]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial
            color="#ffff44"
            emissive="#ffff44"
            emissiveIntensity={1}
          />
        </mesh>

        {/* Right antenna */}
        <mesh position={[0.08, 0.28, 0]} rotation={[0, 0, -0.3]}>
          <cylinderGeometry args={[0.012, 0.012, 0.12]} />
          <meshStandardMaterial
            color="#44ff88"
            emissive="#22cc66"
            emissiveIntensity={0.3}
          />
        </mesh>
        {/* Right antenna bobble */}
        <mesh position={[0.11, 0.33, 0]}>
          <sphereGeometry args={[0.025, 6, 6]} />
          <meshStandardMaterial
            color="#ffff44"
            emissive="#ffff44"
            emissiveIntensity={1}
          />
        </mesh>

        {/* Alien body */}
        <mesh position={[0, -0.08, 0]}>
          <capsuleGeometry args={[0.08, 0.12, 8, 12]} />
          <meshStandardMaterial
            color="#44ff88"
            emissive="#22cc66"
            emissiveIntensity={0.4}
            roughness={0.6}
          />
        </mesh>

        {/* Left arm */}
        <mesh position={[-0.12, -0.06, 0]} rotation={[0, 0, 0.5]}>
          <capsuleGeometry args={[0.025, 0.08, 4, 8]} />
          <meshStandardMaterial
            color="#44ff88"
            emissive="#22cc66"
            emissiveIntensity={0.4}
          />
        </mesh>

        {/* Right arm - waving */}
        <mesh position={[0.14, 0.0, 0]} rotation={[0, 0, -0.8]}>
          <capsuleGeometry args={[0.025, 0.08, 4, 8]} />
          <meshStandardMaterial
            color="#44ff88"
            emissive="#22cc66"
            emissiveIntensity={0.4}
          />
        </mesh>
      </group>

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
