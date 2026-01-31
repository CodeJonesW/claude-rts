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
  | 'init'
  | 'connected'
  | 'usage_update'

// Detailed token usage from Claude Code /usage
export interface TokenDetails {
  inputTokens: number
  outputTokens: number
  cacheReadTokens: number
  cacheCreationTokens: number
}

// Per-model usage breakdown
export interface ModelUsage {
  inputTokens: number
  outputTokens: number
  cacheReadInputTokens: number
  cacheCreationInputTokens: number
  costUSD: number
}

export interface AgentEvent {
  type: AgentEventType
  path?: string
  timestamp: number
  details?: string
  agentId?: string
  // Legacy token fields (for backwards compat)
  tokensUsed?: number
  tokensRemaining?: number
  tokensLimit?: number
  // Real usage data from Claude Code
  usage?: {
    inputTokens: number
    outputTokens: number
    cacheReadInputTokens: number
    cacheCreationInputTokens: number
    totalCostUSD: number
  }
  modelUsage?: Record<string, ModelUsage>
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
  state: 'idle' | 'moving' | 'working' | 'teleporting' | 'beaming_up'
  animationStart?: number
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
