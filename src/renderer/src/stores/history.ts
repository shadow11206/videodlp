import { create } from 'zustand'
import type { HistoryRecord, DeletedRecord } from '@shared/types'

interface HistoryState {
  completed: HistoryRecord[]
  incomplete: HistoryRecord[]
  deleted: DeletedRecord[]
  load: () => Promise<void>
  add: (record: HistoryRecord) => Promise<void>
  remove: (id: string) => Promise<void>
  removeWithFile: (id: string) => Promise<boolean>
  removeBatch: (ids: string[]) => Promise<void>
  removeBatchWithFile: (ids: string[]) => Promise<boolean>
  clearAll: () => Promise<void>
  loadDeleted: () => Promise<void>
  restoreDeleted: (id: string) => Promise<void>
  restoreAllDeleted: () => Promise<void>
  permanentDeleteDeleted: (id: string) => Promise<void>
  clearDeleted: () => Promise<void>
}

export const useHistory = create<HistoryState>((set, get) => ({
  completed: [],
  incomplete: [],
  deleted: [],

  load: async () => {
    const records = await window.api.getHistory()
    set({ completed: records })
  },

  loadDeleted: async () => {
    const records = await window.api.getDeleted()
    set({ deleted: records })
  },

  add: async (record) => {
    await window.api.addHistory(record)
    set({ completed: [record, ...get().completed] })
  },

  remove: async (id) => {
    const record = get().completed.find((r) => r.id === id)
    if (!record) return
    await window.api.moveToDeleted(record)
    set({ completed: get().completed.filter((r) => r.id !== id) })
  },

  removeWithFile: async (id) => {
    const record = get().completed.find((r) => r.id === id)
    if (!record) return false
    const exists = record.filePath ? await window.api.checkFileExists(record.filePath) : false
    if (record.filePath) {
      await window.api.trashFile(record.filePath)
    }
    await window.api.moveToDeleted(record)
    set({ completed: get().completed.filter((r) => r.id !== id) })
    return !record.filePath || exists
  },

  removeBatch: async (ids) => {
    const records = get().completed.filter((r) => ids.includes(r.id))
    await Promise.all(records.map((r) => window.api.moveToDeleted(r)))
    set({ completed: get().completed.filter((r) => !ids.includes(r.id)) })
  },

  removeBatchWithFile: async (ids) => {
    const records = get().completed.filter((r) => ids.includes(r.id))
    let allExist = true
    for (const r of records) {
      if (r.filePath) {
        const exists = await window.api.checkFileExists(r.filePath)
        if (!exists) allExist = false
        await window.api.trashFile(r.filePath)
      }
    }
    await Promise.all(records.map((r) => window.api.moveToDeleted(r)))
    set({ completed: get().completed.filter((r) => !ids.includes(r.id)) })
    return allExist
  },

  clearAll: async () => {
    const records = get().completed
    await Promise.all(records.map((r) => window.api.moveToDeleted(r)))
    set({ completed: [] })
  },

  restoreDeleted: async (id) => {
    await window.api.restoreDeleted(id)
    set({ deleted: get().deleted.filter((r) => r.id !== id) })
    await get().load()
  },

  restoreAllDeleted: async () => {
    const records = get().deleted
    await Promise.all(records.map((r) => window.api.restoreDeleted(r.id)))
    set({ deleted: [] })
    await get().load()
  },

  permanentDeleteDeleted: async (id) => {
    await window.api.permanentDeleteDeleted(id)
    set({ deleted: get().deleted.filter((r) => r.id !== id) })
  },

  clearDeleted: async () => {
    await window.api.clearDeleted()
    set({ deleted: [] })
  }
}))
