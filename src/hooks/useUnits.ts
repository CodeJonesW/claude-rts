import { useState, useCallback, useRef, useEffect } from 'react'
import type { Unit, AgentEvent, GridCell } from '../types'

// Create the persistent Claude agent
const CLAUDE_AGENT: Unit = {
  id: 'claude-agent',
  type: 'scout',
  position: { x: 0, y: 0 },
  state: 'idle',
  createdAt: Date.now(),
}

export function useUnits(getCellByPath: (path: string) => GridCell | undefined) {
  const [units, setUnits] = useState<Unit[]>([CLAUDE_AGENT])
  const workingTimeoutRef = useRef<number | null>(null)

  // Initialize with Claude agent
  useEffect(() => {
    setUnits([{ ...CLAUDE_AGENT }])
  }, [])

  // Handle an agent event - move Claude to the target
  const handleEvent = useCallback((event: AgentEvent) => {
    if (!event.path) return

    const targetCell = getCellByPath(event.path)
    if (!targetCell) return

    // Clear any existing timeout
    if (workingTimeoutRef.current) {
      clearTimeout(workingTimeoutRef.current)
    }

    // Move Claude to the target and set to working
    setUnits([{
      ...CLAUDE_AGENT,
      targetPosition: { x: targetCell.x, y: targetCell.y },
      targetPath: event.path,
      state: 'working',
    }])

    // After working, return to idle
    workingTimeoutRef.current = window.setTimeout(() => {
      setUnits(prev => prev.map(u => ({
        ...u,
        state: 'idle' as const,
      })))
    }, 2000)
  }, [getCellByPath])

  // Clear all units (reset to just Claude)
  const clearUnits = useCallback(() => {
    if (workingTimeoutRef.current) {
      clearTimeout(workingTimeoutRef.current)
    }
    setUnits([{ ...CLAUDE_AGENT }])
  }, [])

  // Spawn unit (for compatibility, just triggers Claude)
  const spawnUnit = useCallback(() => {
    // No-op, Claude is always present
  }, [])

  // Reset agent to origin (used when navigating)
  const resetPosition = useCallback(() => {
    if (workingTimeoutRef.current) {
      clearTimeout(workingTimeoutRef.current)
    }
    setUnits([{
      ...CLAUDE_AGENT,
      position: { x: 0, y: 0 },
      targetPosition: undefined,
      targetPath: undefined,
      state: 'idle',
    }])
  }, [])

  // Trigger teleport animation (for navigating into folders)
  const triggerTeleport = useCallback((onComplete: () => void) => {
    if (workingTimeoutRef.current) {
      clearTimeout(workingTimeoutRef.current)
    }

    // Start teleport animation
    setUnits(prev => prev.map(u => ({
      ...u,
      state: 'teleporting' as const,
      animationStart: Date.now(),
    })))

    // After animation, reset and call completion
    workingTimeoutRef.current = window.setTimeout(() => {
      setUnits([{
        ...CLAUDE_AGENT,
        position: { x: 0, y: 0 },
        targetPosition: undefined,
        targetPath: undefined,
        state: 'idle',
      }])
      onComplete()
    }, 800) // 800ms teleport animation
  }, [])

  // Trigger beam up animation (for navigating up - UFO abduction)
  const triggerBeamUp = useCallback((onComplete: () => void) => {
    if (workingTimeoutRef.current) {
      clearTimeout(workingTimeoutRef.current)
    }

    // Start beam up animation
    setUnits(prev => prev.map(u => ({
      ...u,
      state: 'beaming_up' as const,
      animationStart: Date.now(),
    })))

    // After animation, reset and call completion
    workingTimeoutRef.current = window.setTimeout(() => {
      setUnits([{
        ...CLAUDE_AGENT,
        position: { x: 0, y: 0 },
        targetPosition: undefined,
        targetPath: undefined,
        state: 'idle',
      }])
      onComplete()
    }, 1500) // 1.5s beam up animation
  }, [])

  return {
    units,
    handleEvent,
    spawnUnit,
    clearUnits,
    resetPosition,
    triggerTeleport,
    triggerBeamUp,
  }
}
