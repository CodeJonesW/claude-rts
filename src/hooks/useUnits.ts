import { useState, useCallback, useRef } from 'react'
import type { Unit, UnitType, AgentEvent, GridCell } from '../types'

let unitIdCounter = 0

function createUnit(type: UnitType, startPosition: { x: number; y: number }): Unit {
  return {
    id: `unit-${++unitIdCounter}`,
    type,
    position: { ...startPosition },
    state: 'idle',
    createdAt: Date.now(),
  }
}

function getUnitTypeForEvent(eventType: AgentEvent['type']): UnitType {
  switch (eventType) {
    case 'file_read':
    case 'directory_list':
      return 'scout'
    case 'file_write':
    case 'file_edit':
      return 'builder'
    case 'search':
      return 'searcher'
    default:
      return 'scout'
  }
}

export function useUnits(getCellByPath: (path: string) => GridCell | undefined) {
  const [units, setUnits] = useState<Unit[]>([])
  const activeUnitsRef = useRef<Map<string, Unit>>(new Map())

  // Spawn a unit at the base (0,0) and send it to a target
  const spawnUnit = useCallback((type: UnitType, targetCell: GridCell, targetPath: string) => {
    const unit = createUnit(type, { x: 0, y: 0 })
    unit.targetPosition = { x: targetCell.x, y: targetCell.y }
    unit.targetPath = targetPath
    unit.state = 'moving'

    setUnits(prev => [...prev, unit])
    activeUnitsRef.current.set(unit.id, unit)

    // After "travel time", mark as working, then complete
    const travelTime = Math.sqrt(targetCell.x ** 2 + targetCell.y ** 2) * 100 + 500

    setTimeout(() => {
      setUnits(prev =>
        prev.map(u =>
          u.id === unit.id
            ? { ...u, position: { x: targetCell.x, y: targetCell.y }, state: 'working' as const }
            : u
        )
      )
    }, travelTime)

    // Complete after working
    setTimeout(() => {
      setUnits(prev =>
        prev.map(u =>
          u.id === unit.id
            ? { ...u, state: 'idle' as const }
            : u
        )
      )
      activeUnitsRef.current.delete(unit.id)

      // Remove unit after being idle for a bit
      setTimeout(() => {
        setUnits(prev => prev.filter(u => u.id !== unit.id))
      }, 2000)
    }, travelTime + 1000)

    return unit
  }, [])

  // Handle an agent event - spawn appropriate unit
  const handleEvent = useCallback((event: AgentEvent) => {
    if (!event.path) return

    const targetCell = getCellByPath(event.path)
    if (!targetCell) return

    const unitType = getUnitTypeForEvent(event.type)
    spawnUnit(unitType, targetCell, event.path)
  }, [getCellByPath, spawnUnit])

  // Clear all units
  const clearUnits = useCallback(() => {
    setUnits([])
    activeUnitsRef.current.clear()
  }, [])

  return {
    units,
    handleEvent,
    spawnUnit,
    clearUnits,
  }
}
