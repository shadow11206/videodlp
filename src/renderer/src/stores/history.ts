import { create } from 'zustand'
import type { HistoryRecord } from '@shared/types'

interface HistoryState {
  completed: HistoryRecord[]
  incomplete: HistoryRecord[]
  load: () => Promise<void>
  add: (record: HistoryRecord) => Promise<void>
  remove: (id: string) => Promise<void>
  clearAll: () => Promise<void>
}

export const useHistory = create<HistoryState>((set, get) => ({
  completed: [],
  incomplete: [],

  load: async () => {
    const records = await window.api.getHistory()
    set({ completed: records })
  },

  add: async (record) => {
    await window.api.addHistory(record)
    set({ completed: [record, ...get().completed] })
  },

  remove: async (id) => {
    await window.api.removeHistory(id)
    set({ completed: get().completed.filter((r) => r.id !== id) })
  },

  clearAll: async () => {
    await window.api.clearHistory()
    set({ completed: [] })
  }
}))
