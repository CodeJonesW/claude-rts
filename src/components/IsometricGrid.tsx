import { useMemo, useState } from 'react'
import { Text, Billboard, Line } from '@react-three/drei'
import type { GridCell } from '../types'

interface IsometricGridProps {
  cells: GridCell[]
  exploredPaths: Set<string>
  hiddenPaths?: Set<string>
  onFileClick?: (path: string) => void
  onContextMenu?: (e: { x: number; y: number; path: string; isDirectory: boolean }) => void
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

// Get color by file extension - brighter, more saturated colors for visibility
function getFileColor(name: string | undefined, isDirectory: boolean): string {
  if (isDirectory) {
    return '#6b8aff' // Directories are bright blue
  }

  const ext = name?.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'ts':
    case 'tsx':
      return '#4a9eff' // TypeScript bright blue
    case 'js':
    case 'jsx':
      return '#ffee55' // JavaScript bright yellow
    case 'css':
    case 'scss':
      return '#5588ff' // CSS bright blue
    case 'json':
      return '#aa88ff' // JSON purple
    case 'md':
      return '#44aaff' // Markdown bright blue
    case 'sh':
      return '#66ff66' // Shell bright green
    case 'html':
      return '#ff6644' // HTML bright orange
    case 'svg':
      return '#ffaa44' // SVG orange
    default:
      return '#88aacc' // Default light blue-gray
  }
}

function FileBuilding({
  cell,
  explored,
  isHidden,
  onFileClick,
  onContextMenu,
}: {
  cell: GridCell
  explored: boolean
  isHidden?: boolean
  onFileClick?: (path: string) => void
  onContextMenu?: (e: { x: number; y: number; path: string; isDirectory: boolean }) => void
}) {
  const [x, y, z] = gridToWorld(cell.x, cell.y, cell.elevation)
  const isDirectory = cell.node?.type === 'directory'
  const [hovered, setHovered] = useState(false)

  // Get the base color for this file type
  const fileColor = useMemo(() => getFileColor(cell.node?.name, isDirectory), [isDirectory, cell.node?.name])

  // Larger sizes for better visibility
  const height = isDirectory ? 0.6 : 0.35 + (cell.node?.accessCount || 0) * 0.1
  const width = isDirectory ? 0.8 : 0.55

  // Glow effect for recently accessed or hovered
  const recentlyAccessed = cell.node?.lastAccessed && (Date.now() - cell.node.lastAccessed) < 2000

  // Strong emissive for visibility - all nodes glow, brighter on hover
  const emissiveIntensity = hovered ? 1.5 : recentlyAccessed ? 1.2 : explored ? 0.5 : 0.25

  // Handle click - only for files, not directories
  const handleClick = () => {
    if (!isDirectory && cell.node?.path && onFileClick) {
      onFileClick(cell.node.path)
    }
  }

  // Handle right-click for context menu
  const handleRightClick = (e: { nativeEvent: MouseEvent }) => {
    if (cell.node?.path && onContextMenu) {
      e.nativeEvent.preventDefault()
      e.nativeEvent.stopPropagation()
      onContextMenu({
        x: e.nativeEvent.clientX,
        y: e.nativeEvent.clientY,
        path: cell.node.path,
        isDirectory: isDirectory,
      })
    }
  }

  // Handle hover
  const handlePointerOver = () => {
    setHovered(true)
    document.body.style.cursor = 'pointer'
  }

  const handlePointerOut = () => {
    setHovered(false)
    document.body.style.cursor = 'auto'
  }

  return (
    <group position={[x, y, z]}>
      {/* Base platform - larger and glowing */}
      <mesh position={[0, 0.02, 0]} receiveShadow>
        <boxGeometry args={[width + 0.2, 0.04, width + 0.2]} />
        <meshStandardMaterial
          color={explored ? '#3a4a5a' : '#2a3040'}
          emissive={fileColor}
          emissiveIntensity={explored ? 0.15 : 0.08}
          roughness={0.6}
        />
      </mesh>

      {/* Main building - clickable, larger with strong glow */}
      <mesh
        position={[0, height / 2 + 0.04, 0]}
        castShadow
        receiveShadow
        onClick={handleClick}
        onContextMenu={handleRightClick}
        onPointerOver={handlePointerOver}
        onPointerOut={handlePointerOut}
      >
        <boxGeometry args={[width, height, width]} />
        <meshStandardMaterial
          color={hovered ? '#ffffff' : fileColor}
          emissive={fileColor}
          emissiveIntensity={emissiveIntensity}
          roughness={0.4}
          metalness={0.2}
        />
      </mesh>

      {/* Top cap - brighter highlight */}
      <mesh position={[0, height + 0.06, 0]}>
        <boxGeometry args={[width * 0.8, 0.04, width * 0.8]} />
        <meshStandardMaterial
          color="#ffffff"
          emissive={fileColor}
          emissiveIntensity={hovered ? 1.2 : explored ? 0.8 : 0.4}
          roughness={0.2}
          metalness={0.5}
        />
      </mesh>

      {/* Antenna/beacon for directories */}
      {isDirectory && (
        <>
          <mesh position={[0, height + 0.2, 0]}>
            <cylinderGeometry args={[0.04, 0.04, 0.25]} />
            <meshStandardMaterial
              color={isHidden ? '#ff8844' : '#00ff88'}
              emissive={isHidden ? '#ff8844' : '#00ff88'}
              emissiveIntensity={explored ? 0.8 : 0.4}
            />
          </mesh>
          {/* Glowing beacon on top */}
          <mesh position={[0, height + 0.38, 0]}>
            <sphereGeometry args={[0.08, 8, 8]} />
            <meshStandardMaterial
              color={isHidden ? '#ff8844' : '#00ff88'}
              emissive={isHidden ? '#ff8844' : '#00ff88'}
              emissiveIntensity={1.5}
            />
          </mesh>
        </>
      )}

      {/* Label - simplified for performance */}
      {cell.node && (
        <Billboard
          follow={true}
          lockX={false}
          lockY={false}
          lockZ={false}
          position={[0, height + (isDirectory ? 0.6 : 0.4), 0]}
        >
          <Text
            fontSize={0.18}
            color={explored ? (isDirectory ? '#00ff88' : '#ffffff') : (isDirectory ? '#55aa77' : '#aabbcc')}
            anchorX="center"
            anchorY="bottom"
          >
            {cell.node.name}
          </Text>
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

  // Line runs slightly above ground for visibility
  const points: [number, number, number][] = [
    [px, 0.08, pz],
    [cx, 0.08, cz],
  ]

  return (
    <Line
      points={points}
      color={explored ? '#00ff88' : '#4466aa'}
      lineWidth={explored ? 3 : 2}
      transparent
      opacity={explored ? 0.9 : 0.6}
    />
  )
}

export default function IsometricGrid({ cells, exploredPaths, hiddenPaths, onFileClick, onContextMenu }: IsometricGridProps) {
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
          isHidden={cell.node ? hiddenPaths?.has(cell.node.path) : false}
          onFileClick={onFileClick}
          onContextMenu={onContextMenu}
        />
      ))}
    </group>
  )
}

export { gridToWorld }
