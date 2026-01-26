import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

interface TerminalState {
  terminalId: number | null
  setTerminalId: (id: number | null) => void
}

export const useTerminalStore = create<TerminalState>()(
  persist(
    (set) => ({
      terminalId: null,
      setTerminalId: (id) => set({ terminalId: id }),
    }),
    {
      name: 'terminal-storage', // localStorage key
      storage: createJSONStorage(() => localStorage),
    }
  )
)
