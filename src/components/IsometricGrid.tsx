import { useMemo } from 'react'
import { Text, Billboard, Line } from '@react-three/drei'
import type { GridCell } from '../types'

interface IsometricGridProps {
  cells: GridCell[]
  exploredPaths: Set<string>
}

// Convert grid coordinates to 3D world position
// With radial layout, x and y are already in world-like coordinates
function gridToWorld(x: number, y: number, elevation: number = 0): [number, number, number] {
  // Scale up for better spacing
  const worldX = x * 0.8
  const worldZ = y * 0.8
  const worldY = elevation
  return [worldX, worldY, worldZ]
}

function FileBuilding({ cell, explored }: { cell: GridCell; explored: boolean }) {
  const [x, y, z] = gridToWorld(cell.x, cell.y, cell.elevation)
  const isDirectory = cell.node?.type === 'directory'

  // Color based on file type and explored state
  const baseColor = useMemo(() => {
    if (!explored) return '#1a1a2e' // Fog of war - dark

    if (isDirectory) {
      return '#4a5568' // Directories are gray
    }

    // Color by file extension
    const ext = cell.node?.name.split('.').pop()?.toLowerCase()
    switch (ext) {
      case 'ts':
      case 'tsx':
        return '#3178c6' // TypeScript blue
      case 'js':
      case 'jsx':
        return '#f7df1e' // JavaScript yellow
      case 'css':
      case 'scss':
        return '#264de4' // CSS blue
      case 'json':
        return '#5a5a5a' // JSON gray
      case 'md':
        return '#083fa1' // Markdown blue
      default:
        return '#6b7280' // Default gray
    }
  }, [explored, isDirectory, cell.node?.name])

  const height = isDirectory ? 0.3 : 0.15 + (cell.node?.accessCount || 0) * 0.05
  const width = isDirectory ? 0.5 : 0.35

  // Glow effect for recently accessed
  const recentlyAccessed = cell.node?.lastAccessed && (Date.now() - cell.node.lastAccessed) < 2000

  return (
    <group position={[x, y, z]}>
      {/* Base platform */}
      <mesh position={[0, 0, 0]} receiveShadow>
        <boxGeometry args={[0.55, 0.05, 0.55]} />
        <meshStandardMaterial
          color={explored ? '#2d3748' : '#0f0f1a'}
          roughness={0.8}
        />
      </mesh>

      {/* Building */}
      <mesh position={[0, height / 2 + 0.025, 0]} castShadow receiveShadow>
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial
          color={baseColor}
          emissive={recentlyAccessed ? baseColor : '#000000'}
          emissiveIntensity={recentlyAccessed ? 0.5 : 0}
          roughness={0.6}
          metalness={0.2}
        />
      </mesh>

      {/* Antenna for directories */}
      {isDirectory && explored && (
        <mesh position={[0, height + 0.1, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.15]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={0.3} />
        </mesh>
      )}

      {/* Label */}
      {cell.node && (
        <Billboard
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
          position={[0, height + (isDirectory ? 0.35 : 0.25), 0]}
        >
          <Text
            fontSize={0.12}
            color={explored ? (isDirectory ? '#00ff88' : '#ffffff') : '#333344'}
            anchorX="center"
            anchorY="bottom"
            outlineWidth={0.01}
            outlineColor="#000000"
          >
            {cell.node.name}
          </Text>
          {/* Show parent directory for context on files */}
          {!isDirectory && explored && (
            <Text
              fontSize={0.07}
              color="#666688"
              anchorX="center"
              anchorY="top"
              position={[0, -0.02, 0]}
            >
              {cell.node.path.split('/').slice(-2, -1)[0]}
            </Text>
          )}
        </Billboard>
      )}
    </group>
  )
}

// Connection line between parent and child
function ConnectionLine({
  parentCell,
  childCell,
  explored
}: {
  parentCell: GridCell
  childCell: GridCell
  explored: boolean
}) {
  const [px, , pz] = gridToWorld(parentCell.x, parentCell.y, parentCell.elevation)
  const [cx, , cz] = gridToWorld(childCell.x, childCell.y, childCell.elevation)

  // Line runs along ground level
  const points: [number, number, number][] = [
    [px, 0.02, pz],
    [cx, 0.02, cz],
  ]

  return (
    <Line
      points={points}
      color={explored ? '#00ff88' : '#1a2a1a'}
      lineWidth={explored ? 1.5 : 0.5}
      transparent
      opacity={explored ? 0.6 : 0.2}
    />
  )
}

export default function IsometricGrid({ cells, exploredPaths }: IsometricGridProps) {
  // Calculate bounds for ground plane (radial layout is centered at origin)
  const groundSize = useMemo(() => {
    if (cells.length === 0) return 20
    const maxDist = Math.max(
      ...cells.map(c => Math.sqrt(c.x * c.x + c.y * c.y))
    )
    return Math.max(20, maxDist * 0.8 + 10)
  }, [cells])

  // Build a map of path -> cell for quick parent lookup
  const cellMap = useMemo(() => {
    const map = new Map<string, GridCell>()
    cells.forEach(cell => {
      if (cell.node?.path) {
        map.set(cell.node.path, cell)
      }
    })
    return map
  }, [cells])

  // Generate connection lines (parent-child relationships)
  const connections = useMemo(() => {
    const lines: { parent: GridCell; child: GridCell; key: string }[] = []

    cells.forEach(cell => {
      if (!cell.node?.path) return

      // Get parent path
      const pathParts = cell.node.path.split('/')
      if (pathParts.length <= 2) return // Root has no parent

      const parentPath = pathParts.slice(0, -1).join('/')
      const parentCell = cellMap.get(parentPath)

      if (parentCell) {
        lines.push({
          parent: parentCell,
          child: cell,
          key: `${parentPath}->${cell.node.path}`,
        })
      }
    })

    return lines
  }, [cells, cellMap])

  return (
    <group>
      {/* Ground plane - centered at origin */}
      <mesh
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, -0.1, 0]}
        receiveShadow
      >
        <planeGeometry args={[groundSize * 2, groundSize * 2]} />
        <meshStandardMaterial
          color="#0a0a12"
          roughness={0.9}
        />
      </mesh>

      {/* Grid lines - centered */}
      <gridHelper
        args={[groundSize * 2, Math.floor(groundSize), '#1a1a2e', '#1a1a2e']}
        position={[0, -0.05, 0]}
      />

      {/* Connection lines */}
      {connections.map(({ parent, child, key }) => (
        <ConnectionLine
          key={key}
          parentCell={parent}
          childCell={child}
          explored={
            (parent.node ? exploredPaths.has(parent.node.path) : false) &&
            (child.node ? exploredPaths.has(child.node.path) : false)
          }
        />
      ))}

      {/* File buildings */}
      {cells.map((cell) => (
        <FileBuilding
          key={cell.node?.path || `${cell.x}-${cell.y}`}
          cell={cell}
          explored={cell.node ? exploredPaths.has(cell.node.path) : false}
        />
      ))}
    </group>
  )
}

export { gridToWorld }
