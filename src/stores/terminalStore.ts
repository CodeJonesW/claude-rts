import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface TerminalInfo {
  id: number
  createdAt: number
}

interface TerminalState {
  terminals: TerminalInfo[]
  activeTerminalId: number | null
  addTerminal: (id: number) => void
  removeTerminal: (id: number) => void
  setActiveTerminal: (id: number | null) => void
  hasTerminals: () => boolean
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set, get) => ({
      terminals: [],
      activeTerminalId: null,
      addTerminal: (id) =>
        set((state) => {
          // Don't add if already exists
          if (state.terminals.some((t) => t.id === id)) {
            return state
          }
          return {
            terminals: [...state.terminals, { id, createdAt: Date.now() }],
            activeTerminalId: id, // Set as active when created
          }
        }),
      removeTerminal: (id) =>
        set((state) => {
          const newTerminals = state.terminals.filter((t) => t.id !== id)
          // If we removed the active terminal, set a new active one or null
          let newActiveId = state.activeTerminalId
          if (newActiveId === id) {
            newActiveId = newTerminals.length > 0 ? newTerminals[0].id : null
          }
          return {
            terminals: newTerminals,
            activeTerminalId: newActiveId,
          }
        }),
      setActiveTerminal: (id) => set({ activeTerminalId: id }),
      hasTerminals: () => get().terminals.length > 0,
    }),
    {
      name: 'terminal-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
)
