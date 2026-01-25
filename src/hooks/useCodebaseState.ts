import { useState, useCallback } from 'react'
import type { FileNode, AgentEvent, GridCell } from '../types'

// Convert a flat file list to a tree structure
function buildFileTree(paths: string[], basePath: string): FileNode {
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

  // Sort paths so directories come before their contents
  const sortedPaths = [...paths].sort()

  for (const fullPath of sortedPaths) {
    const relativePath = fullPath.replace(basePath + '/', '')
    const parts = relativePath.split('/')
    let currentPath = basePath

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]
      const newPath = currentPath + '/' + part
      const isLast = i === parts.length - 1

      if (!nodeMap.has(newPath)) {
        const node: FileNode = {
          name: part,
          path: newPath,
          type: isLast ? 'file' : 'directory',
          children: isLast ? undefined : [],
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

// Convert tree to grid layout using a radial tree structure
function treeToGrid(root: FileNode, maxDepth = 5): GridCell[] {
  const cells: GridCell[] = []
  const spacing = 1.2 // Space between nodes

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

    // Calculate weight for each child based on descendants
    const weights = sorted.map(child => countDescendants(child))
    const totalWeight = weights.reduce((a, b) => a + b, 0)

    let currentAngle = angleStart
    const radius = depth * spacing * 2

    sorted.forEach((child, index) => {
      // Angle span proportional to weight
      const childAngleSpan = (weights[index] / totalWeight) * angleRange
      const angle = currentAngle + childAngleSpan / 2

      // Convert polar to cartesian
      const x = parentX + Math.cos(angle) * radius
      const y = parentY + Math.sin(angle) * radius

      cells.push({
        x: Math.round(x * 10) / 10,
        y: Math.round(y * 10) / 10,
        node: child,
        elevation: depth * 0.15,
      })

      // Recursively layout children in a sub-arc
      if (child.type === 'directory' && child.children) {
        const subAngleStart = currentAngle
        const subAngleEnd = currentAngle + childAngleSpan
        layoutChildren(child, x, y, depth + 1, subAngleStart, subAngleEnd)
      }

      currentAngle += childAngleSpan
    })
  }

  // Start layout from root, spanning full circle (or half for better visibility)
  if (root.children && root.children.length > 0) {
    layoutChildren(root, 0, 0, 1, -Math.PI * 0.75, Math.PI * 0.75)
  }

  return cells
}

export function useCodebaseState(basePath: string) {
  const [fileTree, setFileTree] = useState<FileNode | null>(null)
  const [grid, setGrid] = useState<GridCell[]>([])
  const [exploredPaths, setExploredPaths] = useState<Set<string>>(new Set())

  // Initialize the codebase from a list of file paths
  const initializeCodebase = useCallback((paths: string[]) => {
    const tree = buildFileTree(paths, basePath)
    setFileTree(tree)
    setGrid(treeToGrid(tree))
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

  return {
    fileTree,
    grid,
    exploredPaths,
    initializeCodebase,
    handleEvent,
    getCellByPath,
  }
}
