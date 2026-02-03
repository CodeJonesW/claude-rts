import { useState, useCallback } from 'react'
import type { FileNode, AgentEvent, GridCell } from '../types'

interface FileEntry {
  path: string
  type: 'file' | 'directory'
}

// Convert a flat file list to a tree structure
function buildFileTree(entries: FileEntry[], basePath: string): FileNode {
  const root: FileNode = {
    name: basePath.split('/').pop() || 'root',
    path: basePath,
    type: 'directory',
    children: [],
    explored: false,
    accessCount: 0,
  }

  const nodeMap = new Map<string, FileNode>()
  nodeMap.set(basePath, root)

  // Create a type lookup for fast access
  const typeMap = new Map<string, 'file' | 'directory'>()
  for (const entry of entries) {
    typeMap.set(entry.path, entry.type)
  }

  // Sort entries so directories come before their contents
  const sortedEntries = [...entries].sort((a, b) => a.path.localeCompare(b.path))

  for (const entry of sortedEntries) {
    const relativePath = entry.path.replace(basePath + '/', '')
    const parts = relativePath.split('/')
    let currentPath = basePath

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const newPath = currentPath + '/' + part
      const isLast = i === parts.length - 1

      if (!nodeMap.has(newPath)) {
        // Use the type from the server if this is the actual entry, otherwise infer
        const nodeType = isLast ? entry.type : 'directory'
        const node: FileNode = {
          name: part,
          path: newPath,
          type: nodeType,
          children: nodeType === 'directory' ? [] : undefined,
          explored: false,
          accessCount: 0,
        }
        nodeMap.set(newPath, node)

        const parent = nodeMap.get(currentPath)
        if (parent && parent.children) {
          parent.children.push(node)
        }
      }

      currentPath = newPath
    }
  }

  return root
}

// Count total descendants for sizing
function countDescendants(node: FileNode): number {
  if (!node.children || node.children.length === 0) return 1
  return 1 + node.children.reduce((sum, child) => sum + countDescendants(child), 0)
}

// Find directories with more than threshold descendants
function findLargeDirectories(node: FileNode, threshold: number): string[] {
  const largeDirs: string[] = []

  function traverse(n: FileNode) {
    if (n.type === 'directory' && n.children && n.children.length > 0) {
      const count = countDescendants(n) - 1 // subtract 1 to not count self
      if (count >= threshold) {
        largeDirs.push(n.path)
      }
      // Still traverse children to find nested large dirs
      n.children.forEach(traverse)
    }
  }

  traverse(node)
  return largeDirs
}

// Find a node by path in the tree
function findNode(node: FileNode, targetPath: string): FileNode | null {
  if (node.path === targetPath) return node
  if (node.children) {
    for (const child of node.children) {
      const found = findNode(child, targetPath)
      if (found) return found
    }
  }
  return null
}

// Spacing constants (in grid units, before gridToWorld 0.8x scaling)
const SPACING = {
  DIR_FOOTPRINT: 1.25,   // directory building width (1.0 world) / 0.8 scale
  FILE_FOOTPRINT: 0.94,  // file building width (0.75 world) / 0.8 scale
  MIN_SIBLING_GAP: 0.2,  // padding between adjacent siblings
  SUBTREE_BUFFER: 0.4,   // extra space per child for folders that have children
}

// Euclidean distance between two points
function euclideanDistance(x1: number, y1: number, x2: number, y2: number): number {
  return Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
}

// Minimum distance required between two nodes to avoid overlap
function minNodeDistance(a: FileNode, b: FileNode): number {
  const sizeA = a.type === 'directory' ? SPACING.DIR_FOOTPRINT : SPACING.FILE_FOOTPRINT
  const sizeB = b.type === 'directory' ? SPACING.DIR_FOOTPRINT : SPACING.FILE_FOOTPRINT
  return (sizeA + sizeB) / 2 + SPACING.MIN_SIBLING_GAP
}

// Calculate how much arc length a child needs based on its footprint and subtree
function childArcLength(child: FileNode): number {
  const footprint = child.type === 'directory' ? SPACING.DIR_FOOTPRINT : SPACING.FILE_FOOTPRINT
  const hasChildren = child.type === 'directory' && child.children && child.children.length > 0
  const subtreeExtra = hasChildren ? SPACING.SUBTREE_BUFFER * Math.min(child.children!.length, 4) : 0
  return footprint + SPACING.MIN_SIBLING_GAP + subtreeExtra
}

// Detect collisions between all node pairs
function detectCollisions(cells: GridCell[]): { i: number; j: number; overlap: number }[] {
  const collisions: { i: number; j: number; overlap: number }[] = []
  for (let i = 0; i < cells.length; i++) {
    for (let j = i + 1; j < cells.length; j++) {
      if (!cells[i].node || !cells[j].node) continue
      const dist = euclideanDistance(cells[i].x, cells[i].y, cells[j].x, cells[j].y)
      const minDist = minNodeDistance(cells[i].node, cells[j].node)
      if (dist < minDist) {
        collisions.push({ i, j, overlap: minDist - dist })
      }
    }
  }
  return collisions
}

// Push overlapping nodes apart using force-directed repulsion
function resolveCollisions(cells: GridCell[], maxIterations = 10): GridCell[] {
  const result = cells.map(c => ({ ...c }))

  for (let iter = 0; iter < maxIterations; iter++) {
    const collisions = detectCollisions(result)
    if (collisions.length === 0) break

    const forces = new Map<number, { fx: number; fy: number }>()
    for (let i = 0; i < result.length; i++) {
      forces.set(i, { fx: 0, fy: 0 })
    }

    for (const { i, j, overlap } of collisions) {
      const dx = result[j].x - result[i].x
      const dy = result[j].y - result[i].y
      const dist = Math.max(euclideanDistance(result[i].x, result[i].y, result[j].x, result[j].y), 0.01)

      const pushAmount = (overlap / 2) + 0.05
      const nx = dx / dist
      const ny = dy / dist

      forces.get(i)!.fx -= nx * pushAmount
      forces.get(i)!.fy -= ny * pushAmount
      forces.get(j)!.fx += nx * pushAmount
      forces.get(j)!.fy += ny * pushAmount
    }

    // Apply forces, skip root (index 0)
    for (let i = 1; i < result.length; i++) {
      const f = forces.get(i)!
      result[i].x = Math.round((result[i].x + f.fx) * 100) / 100
      result[i].y = Math.round((result[i].y + f.fy) * 100) / 100
    }
  }

  return result
}

// Convert tree to grid layout using a radial tree structure with distance-aware spacing
function treeToGrid(root: FileNode, maxDepth = 3): GridCell[] {
  const cells: GridCell[] = []

  // Root at origin
  cells.push({
    x: 0,
    y: 0,
    node: root,
    elevation: 0,
  })

  function layoutChildren(
    parent: FileNode,
    parentX: number,
    parentY: number,
    depth: number,
    angleStart: number,
    angleEnd: number
  ) {
    if (depth > maxDepth || !parent.children || parent.children.length === 0) return

    // Sort: directories first, then files
    const sorted = [...parent.children].sort((a, b) => {
      if (a.type === 'directory' && b.type === 'file') return -1
      if (a.type === 'file' && b.type === 'directory') return 1
      return a.name.localeCompare(b.name)
    })

    const angleRange = angleEnd - angleStart

    // Calculate required arc length for each child based on footprint + subtree size
    const arcLengths = sorted.map(child => childArcLength(child))
    const totalArcNeeded = arcLengths.reduce((a, b) => a + b, 0)

    // Dynamic radius: ensure arc length at this radius fits all children
    // Arc length = radius * angle, so radius = totalArcNeeded / angleRange
    const requiredRadius = totalArcNeeded / Math.abs(angleRange)
    const baseRadius = 3.5 + Math.log2(depth + 1) * 2
    const radius = Math.max(requiredRadius, baseRadius)

    // Allocate angles proportional to each child's arc length requirement
    const totalArc = arcLengths.reduce((a, b) => a + b, 0)
    let currentAngle = angleStart

    sorted.forEach((child, index) => {
      const arcRatio = arcLengths[index] / totalArc
      const childAngleSpan = arcRatio * angleRange
      const angle = currentAngle + childAngleSpan / 2

      // Convert polar to cartesian (relative to parent)
      const x = parentX + Math.cos(angle) * radius
      const y = parentY + Math.sin(angle) * radius

      cells.push({
        x: Math.round(x * 100) / 100,
        y: Math.round(y * 100) / 100,
        node: child,
        elevation: depth * 0.1,
      })

      // Recursively layout children in a sub-arc
      if (child.type === 'directory' && child.children && child.children.length > 0) {
        const subAngleSpread = Math.max(childAngleSpan * 0.9, 0.5)
        const subAngleStart = angle - subAngleSpread / 2
        const subAngleEnd = angle + subAngleSpread / 2
        layoutChildren(child, x, y, depth + 1, subAngleStart, subAngleEnd)
      }

      currentAngle += childAngleSpan
    })
  }

  // Start layout from root, using full circle for even distribution
  if (root.children && root.children.length > 0) {
    layoutChildren(root, 0, 0, 1, -Math.PI, Math.PI)
  }

  // Post-layout: resolve any remaining collisions via force-directed repulsion
  return resolveCollisions(cells)
}

export function useCodebaseState(basePath: string) {
  const [fileTree, setFileTree] = useState<FileNode | null>(null)
  const [grid, setGrid] = useState<GridCell[]>([])
  const [exploredPaths, setExploredPaths] = useState<Set<string>>(new Set())

  // Initialize the codebase from a list of file entries
  // Returns paths of directories with 100+ items (for auto-hiding)
  const initializeCodebase = useCallback((entries: FileEntry[] | string[]): string[] => {
    // Handle both old format (string[]) and new format (FileEntry[])
    const fileEntries: FileEntry[] = entries.length > 0 && typeof entries[0] === 'string'
      ? (entries as string[]).map(p => ({ path: p, type: 'file' as const }))
      : entries as FileEntry[]

    const tree = buildFileTree(fileEntries, basePath)
    const newGrid = treeToGrid(tree)
    setFileTree(tree)
    setGrid(newGrid)

    // Find and return large directories (100+ items)
    return findLargeDirectories(tree, 100)
  }, [basePath])

  // Handle an agent event - update explored state
  const handleEvent = useCallback((event: AgentEvent) => {
    if (!event.path) return

    setExploredPaths(prev => {
      const next = new Set(prev)
      next.add(event.path!)

      // Also mark parent directories as explored
      const parts = event.path!.split('/')
      for (let i = 1; i < parts.length; i++) {
        next.add(parts.slice(0, i + 1).join('/'))
      }

      return next
    })

    // Update the file tree node
    setFileTree(prev => {
      if (!prev) return prev

      const updateNode = (node: FileNode): FileNode => {
        if (node.path === event.path) {
          return {
            ...node,
            explored: true,
            lastAccessed: event.timestamp,
            accessCount: node.accessCount + 1,
          }
        }
        if (node.children) {
          return {
            ...node,
            children: node.children.map(updateNode),
          }
        }
        return node
      }

      return updateNode(prev)
    })

    // Regenerate grid with updated tree
    setGrid(prev => {
      return prev.map(cell => {
        if (cell.node && cell.node.path === event.path) {
          const updatedNode: FileNode = {
            ...cell.node,
            explored: true,
            lastAccessed: event.timestamp,
            accessCount: cell.node.accessCount + 1,
          }
          return {
            ...cell,
            node: updatedNode,
          }
        }
        return cell
      })
    })
  }, [])

  // Get grid cell by file path
  const getCellByPath = useCallback((path: string): GridCell | undefined => {
    return grid.find(cell => cell.node?.path === path)
  }, [grid])

  // Get subtree grid for a given view root
  const getSubtreeGrid = useCallback((viewRoot: string): GridCell[] => {
    if (!fileTree) return []
    if (viewRoot === basePath) return grid

    const subtreeRoot = findNode(fileTree, viewRoot)
    if (!subtreeRoot) return grid

    return treeToGrid(subtreeRoot)
  }, [fileTree, grid, basePath])

  // Get cell by path from a specific subtree view
  const getViewCellByPath = useCallback((path: string, viewRoot: string): GridCell | undefined => {
    const viewGrid = getSubtreeGrid(viewRoot)
    return viewGrid.find(cell => cell.node?.path === path)
  }, [getSubtreeGrid])

  return {
    fileTree,
    grid,
    exploredPaths,
    initializeCodebase,
    handleEvent,
    getCellByPath,
    getSubtreeGrid,
    getViewCellByPath,
  }
}
