import { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Unit as UnitType } from '../types'
import { gridToWorld } from './IsometricGrid'

interface UnitProps {
  unit: UnitType
}

export default function Unit({ unit }: UnitProps) {
  const meshRef = useRef<THREE.Group>(null)
  const startTime = useRef(Date.now())

  // Unit appearance based on type
  const config = useMemo(() => {
    switch (unit.type) {
      case 'scout':
        return {
          color: '#00ff88',
          emissive: '#00ff88',
          size: 0.12,
          shape: 'cone' as const,
        }
      case 'builder':
        return {
          color: '#ff8800',
          emissive: '#ff8800',
          size: 0.15,
          shape: 'box' as const,
        }
      case 'searcher':
        return {
          color: '#8800ff',
          emissive: '#8800ff',
          size: 0.1,
          shape: 'sphere' as const,
        }
      case 'debugger':
        return {
          color: '#ff0044',
          emissive: '#ff0044',
          size: 0.12,
          shape: 'octahedron' as const,
        }
      default:
        return {
          color: '#ffffff',
          emissive: '#ffffff',
          size: 0.1,
          shape: 'sphere' as const,
        }
    }
  }, [unit.type])

  // Animate position
  useFrame(() => {
    if (!meshRef.current) return

    const elapsed = (Date.now() - startTime.current) / 1000

    // Calculate current position (lerp from start to target)
    const startPos = gridToWorld(0, 0, 0)
    const targetPos = unit.targetPosition
      ? gridToWorld(unit.targetPosition.x, unit.targetPosition.y, 0.3)
      : startPos

    const travelDuration = Math.sqrt(
      (unit.targetPosition?.x || 0) ** 2 + (unit.targetPosition?.y || 0) ** 2
    ) * 0.1 + 0.5

    let t = Math.min(elapsed / travelDuration, 1)
    // Ease out cubic
    t = 1 - Math.pow(1 - t, 3)

    const currentX = startPos[0] + (targetPos[0] - startPos[0]) * t
    const currentZ = startPos[2] + (targetPos[2] - startPos[2]) * t

    // Hover height with bobbing
    const baseHeight = 0.3
    const bobHeight = Math.sin(elapsed * 4) * 0.05
    const currentY = baseHeight + bobHeight + (unit.state === 'working' ? 0.1 : 0)

    meshRef.current.position.set(currentX, currentY, currentZ)

    // Rotate while moving
    if (unit.state === 'moving') {
      meshRef.current.rotation.y += 0.05
    } else if (unit.state === 'working') {
      meshRef.current.rotation.y += 0.1
      meshRef.current.rotation.x = Math.sin(elapsed * 8) * 0.2
    }
  })

  const pulseIntensity = unit.state === 'working' ? 0.8 : 0.4

  return (
    <group ref={meshRef}>
      {/* Main body */}
      {config.shape === 'cone' && (
        <mesh rotation={[0, 0, Math.PI]}>
          <coneGeometry args={[config.size, config.size * 2, 6]} />
          <meshStandardMaterial
            color={config.color}
            emissive={config.emissive}
            emissiveIntensity={pulseIntensity}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      )}
      {config.shape === 'box' && (
        <mesh>
          <boxGeometry args={[config.size, config.size, config.size]} />
          <meshStandardMaterial
            color={config.color}
            emissive={config.emissive}
            emissiveIntensity={pulseIntensity}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      )}
      {config.shape === 'sphere' && (
        <mesh>
          <sphereGeometry args={[config.size, 16, 16]} />
          <meshStandardMaterial
            color={config.color}
            emissive={config.emissive}
            emissiveIntensity={pulseIntensity}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      )}
      {config.shape === 'octahedron' && (
        <mesh>
          <octahedronGeometry args={[config.size]} />
          <meshStandardMaterial
            color={config.color}
            emissive={config.emissive}
            emissiveIntensity={pulseIntensity}
            roughness={0.3}
            metalness={0.7}
          />
        </mesh>
      )}

      {/* Point light for glow effect */}
      <pointLight
        color={config.emissive}
        intensity={unit.state === 'working' ? 2 : 0.5}
        distance={1.5}
        decay={2}
      />

      {/* Trail particles when moving */}
      {unit.state === 'moving' && (
        <>
          <mesh position={[0, -0.1, 0]} scale={0.5}>
            <sphereGeometry args={[config.size * 0.5, 8, 8]} />
            <meshStandardMaterial
              color={config.color}
              emissive={config.emissive}
              emissiveIntensity={0.2}
              transparent
              opacity={0.5}
            />
          </mesh>
        </>
      )}
    </group>
  )
}
