// Event types from Claude Code activity
export type AgentEventType =
  | 'file_read'
  | 'file_write'
  | 'file_edit'
  | 'directory_list'
  | 'search'
  | 'command_run'
  | 'thinking'
  | 'task_start'
  | 'task_complete'

export interface AgentEvent {
  type: AgentEventType
  path?: string
  timestamp: number
  details?: string
}

// Codebase structure
export interface FileNode {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
  explored: boolean
  lastAccessed?: number
  accessCount: number
}

// Unit types
export type UnitType = 'scout' | 'builder' | 'debugger' | 'searcher'

export interface Unit {
  id: string
  type: UnitType
  position: { x: number; y: number }
  targetPosition?: { x: number; y: number }
  targetPath?: string
  state: 'idle' | 'moving' | 'working'
  createdAt: number
}

// Grid cell for the map
export interface GridCell {
  x: number
  y: number
  node?: FileNode
  elevation: number
}

// Resources (token usage, etc.)
export interface Resources {
  tokensUsed: number
  tokensRemaining: number
  filesExplored: number
  filesTotal: number
}
