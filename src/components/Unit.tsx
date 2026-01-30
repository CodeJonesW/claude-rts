import { useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import type { Unit as UnitType } from '../types'
import { gridToWorld } from './IsometricGrid'

interface UnitProps {
  unit: UnitType
}

export default function Unit({ unit }: UnitProps) {
  const groupRef = useRef<THREE.Group>(null)
  const monitorRef = useRef<THREE.Group>(null)
  const screenRef = useRef<THREE.Mesh>(null)
  const ufoRef = useRef<THREE.Group>(null)
  const startTime = useRef(Date.now())
  const { camera } = useThree()

  // Floating height above the grid
  const FLOAT_HEIGHT = 3

  // Animation state refs
  const teleportPhaseRef = useRef(0)
  const beamUpPhaseRef = useRef(0)
  const prevStateRef = useRef(unit.state)

  // Animate position - throttled to reduce CPU load
  const lastUpdateRef = useRef(0)

  useFrame(() => {
    if (!groupRef.current) return

    const now = Date.now()
    const elapsed = (now - startTime.current) / 1000

    // Calculate animation progress
    const animElapsed = unit.animationStart ? (now - unit.animationStart) / 1000 : 0

    // Throttle position updates to ~30fps
    const shouldUpdatePosition = now - lastUpdateRef.current > 33

    if (shouldUpdatePosition) {
      lastUpdateRef.current = now

      // Handle teleport animation
      if (unit.state === 'teleporting') {
        teleportPhaseRef.current = animElapsed

        // Rapid flicker effect
        const flickerRate = 30 // flickers per second
        const flicker = Math.sin(animElapsed * flickerRate * Math.PI * 2) > 0
        groupRef.current.visible = flicker || animElapsed > 0.6

        // Scale effect - shrink then expand
        const progress = animElapsed / 0.8
        let scale = 1
        if (progress < 0.3) {
          // Shrink
          scale = 1 - progress * 2
        } else if (progress < 0.5) {
          // Tiny
          scale = 0.1
        } else if (progress < 0.8) {
          // Hidden phase
          scale = 0
          groupRef.current.visible = false
        } else {
          // Reappear
          scale = (progress - 0.8) * 5
          groupRef.current.visible = true
        }
        groupRef.current.scale.setScalar(Math.max(0, scale))

        // Glitch offset
        if (flicker && animElapsed < 0.5) {
          groupRef.current.position.x += (Math.random() - 0.5) * 0.3
          groupRef.current.position.z += (Math.random() - 0.5) * 0.3
        }

        return // Skip normal position updates during teleport
      }

      // Handle beam up animation (UFO abduction)
      if (unit.state === 'beaming_up') {
        beamUpPhaseRef.current = animElapsed

        const progress = animElapsed / 1.5

        // Sync UFO XZ position with agent
        if (ufoRef.current && groupRef.current) {
          ufoRef.current.position.x = groupRef.current.position.x
          ufoRef.current.position.z = groupRef.current.position.z

          if (progress < 0.3) {
            // UFO descends from above
            const ufoProgress = progress / 0.3
            ufoRef.current.position.y = 18 - ufoProgress * 10 // 18 -> 8
            ufoRef.current.visible = true
          } else if (progress < 0.8) {
            // UFO hovers at 8, agent rises into tractor beam
            ufoRef.current.position.y = 8
            const riseProgress = (progress - 0.3) / 0.5
            groupRef.current.position.y = FLOAT_HEIGHT + riseProgress * 4.5 // Rise to ~7.5
            // Spin agent while rising
            groupRef.current.rotation.y = riseProgress * Math.PI * 4
            // Shrink agent as it gets "beamed up"
            const shrinkScale = 1 - riseProgress * 0.7
            groupRef.current.scale.setScalar(Math.max(0.3, shrinkScale))
          } else {
            // UFO (with tiny agent) flies away
            const flyProgress = (progress - 0.8) / 0.2
            ufoRef.current.position.y = 8 + flyProgress * 25
            groupRef.current.position.y = 7.5 + flyProgress * 25
            groupRef.current.scale.setScalar(0.3)
            groupRef.current.visible = flyProgress < 0.3
            ufoRef.current.visible = flyProgress < 0.9
          }
        }

        return // Skip normal position updates during beam up
      }

      // Check if we just finished an animation - snap to position instead of lerping
      const justFinishedAnimation =
        (prevStateRef.current === 'teleporting' || prevStateRef.current === 'beaming_up') &&
        unit.state === 'idle'

      // Reset animation refs when not animating
      teleportPhaseRef.current = 0
      beamUpPhaseRef.current = 0
      groupRef.current.visible = true
      groupRef.current.scale.setScalar(1)

      // Update prev state
      prevStateRef.current = unit.state

      // Calculate target position above the file being accessed
      let targetX = 0
      let targetZ = 0

      if (unit.targetPosition) {
        const worldPos = gridToWorld(unit.targetPosition.x, unit.targetPosition.y, 0)
        targetX = worldPos[0]
        targetZ = worldPos[2]
      }

      // Gentle floating motion
      const floatOffset = Math.sin(elapsed * 1.5) * 0.15
      const newY = FLOAT_HEIGHT + floatOffset
      const currentPos = groupRef.current.position

      // If just finished animation, snap to position immediately
      if (justFinishedAnimation) {
        groupRef.current.position.set(targetX, newY, targetZ)
        groupRef.current.rotation.y = 0
      } else {
        // Smooth movement towards target
        const lerpSpeed = 0.05 // Slightly faster to compensate for lower update rate
        const newX = currentPos.x + (targetX - currentPos.x) * lerpSpeed
        const newZ = currentPos.z + (targetZ - currentPos.z) * lerpSpeed

        groupRef.current.position.set(newX, newY, newZ)
        groupRef.current.rotation.y = 0 // Reset Y rotation
      }

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
      } else if (unit.state === 'teleporting') {
        // Intense flicker during teleport
        material.emissiveIntensity = 3 + Math.sin(elapsed * 50) * 2
      } else {
        material.emissiveIntensity = 1.0 + Math.sin(elapsed * 3) * 0.2
      }
    }

    // Make monitor face the camera (Y-axis billboard) - but not during beam up
    if (monitorRef.current && groupRef.current && unit.state !== 'beaming_up') {
      const monitorPos = groupRef.current.position
      const cameraPos = camera.position

      // Calculate angle to camera on XZ plane only
      const angle = Math.atan2(
        cameraPos.x - monitorPos.x,
        cameraPos.z - monitorPos.z
      )
      monitorRef.current.rotation.y = angle
    }
  })

  // Teleport particle color
  const teleportColor = '#00ffff'

  // Screen color based on state
  const screenColor = unit.state === 'working' ? '#00ffaa' : '#00ff88'
  const frameColor = '#1a1a2a'

  return (
    <>
    <group ref={groupRef} position={[0, FLOAT_HEIGHT, 0]}>
      {/* Monitor group - rotates to face camera */}
      <group ref={monitorRef}>
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
      </group>

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

      {/* Teleport effect */}
      {unit.state === 'teleporting' && (
        <>
          {/* Glowing ring */}
          <mesh position={[0, -2, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.5, 0.1, 8, 32]} />
            <meshStandardMaterial
              color={teleportColor}
              emissive={teleportColor}
              emissiveIntensity={3}
              transparent
              opacity={0.8}
            />
          </mesh>
          {/* Vertical energy lines */}
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <mesh
              key={i}
              position={[
                Math.cos((i / 6) * Math.PI * 2) * 1.2,
                0,
                Math.sin((i / 6) * Math.PI * 2) * 1.2,
              ]}
            >
              <cylinderGeometry args={[0.03, 0.03, 6, 6]} />
              <meshStandardMaterial
                color={teleportColor}
                emissive={teleportColor}
                emissiveIntensity={2}
                transparent
                opacity={0.6}
              />
            </mesh>
          ))}
          {/* Central glow */}
          <pointLight
            position={[0, 0, 0]}
            intensity={10}
            distance={8}
            color={teleportColor}
          />
        </>
      )}

    </group>

    {/* UFO for beam up - positioned in world space, follows agent XZ */}
    {unit.state === 'beaming_up' && (
      <group ref={ufoRef} position={[0, 12, 0]}>
        {/* UFO body - classic saucer shape */}
        <mesh>
          <sphereGeometry args={[2, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshStandardMaterial
            color="#333344"
            metalness={0.9}
            roughness={0.2}
          />
        </mesh>
        {/* UFO dome */}
        <mesh position={[0, 0.3, 0]}>
          <sphereGeometry args={[0.8, 12, 8]} />
          <meshStandardMaterial
            color="#4488ff"
            emissive="#4488ff"
            emissiveIntensity={0.5}
            transparent
            opacity={0.7}
          />
        </mesh>
        {/* UFO rim */}
        <mesh position={[0, -0.2, 0]}>
          <torusGeometry args={[2, 0.3, 8, 24]} />
          <meshStandardMaterial
            color="#555566"
            metalness={0.9}
            roughness={0.1}
          />
        </mesh>
        {/* UFO lights around rim */}
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <mesh
            key={i}
            position={[
              Math.cos((i / 8) * Math.PI * 2) * 2.1,
              -0.2,
              Math.sin((i / 8) * Math.PI * 2) * 2.1,
            ]}
          >
            <sphereGeometry args={[0.15, 8, 8]} />
            <meshStandardMaterial
              color={i % 2 === 0 ? '#ff4444' : '#44ff44'}
              emissive={i % 2 === 0 ? '#ff4444' : '#44ff44'}
              emissiveIntensity={2}
            />
          </mesh>
        ))}
        {/* Bottom light / tractor beam source */}
        <mesh position={[0, -0.5, 0]}>
          <coneGeometry args={[0.5, 0.3, 12]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={2}
          />
        </mesh>
        {/* Tractor beam */}
        <mesh position={[0, -4, 0]}>
          <cylinderGeometry args={[0.3, 2, 7, 12, 1, true]} />
          <meshStandardMaterial
            color="#00ff88"
            emissive="#00ff88"
            emissiveIntensity={1}
            transparent
            opacity={0.3}
            side={THREE.DoubleSide}
          />
        </mesh>
        {/* Tractor beam light */}
        <spotLight
          position={[0, -0.5, 0]}
          angle={0.5}
          penumbra={0.8}
          intensity={15}
          distance={15}
          color="#00ff88"
        />
      </group>
    )}
    </>
  )
}

// Wrapper component for Scene compatibility
export function UnitWithEffects({ unit }: UnitProps) {
  return <Unit unit={unit} />
}
