import { create } from 'zustand'
import type { DownloadTask } from '@shared/types'

const BATCH_WINDOW_MS = 5 * 60 * 1000

function generateBatchId(): string {
  return `batch_${Date.now()}`
}

interface DownloadState {
  tasks: DownloadTask[]
  currentBatchId: string
  lastBatchActivity: number
  addTask: (task: DownloadTask) => void
  updateTask: (task: DownloadTask) => void
  removeTask: (id: string) => void
  startNewBatch: () => string
  getBatchId: () => string
  cancelAll: () => Promise<void>
  getActiveCount: () => number
}

export const useDownload = create<DownloadState>((set, get) => ({
  tasks: [],
  currentBatchId: generateBatchId(),
  lastBatchActivity: Date.now(),

  startNewBatch: () => {
    const newId = generateBatchId()
    set({ currentBatchId: newId, lastBatchActivity: Date.now() })
    return newId
  },

  getBatchId: () => {
    const { currentBatchId, lastBatchActivity } = get()
    const now = Date.now()
    if (now - lastBatchActivity > BATCH_WINDOW_MS) {
      const newId = generateBatchId()
      set({ currentBatchId: newId, lastBatchActivity: now })
      return newId
    }
    set({ lastBatchActivity: now })
    return currentBatchId
  },

  addTask: (task) => {
    const batchId = get().getBatchId()
    set((s) => ({ tasks: [...s.tasks, { ...task, batchId }] }))
  },

  updateTask: (updated) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === updated.id ? updated : t))
    }))
  },

  removeTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },

  cancelAll: async () => {
    const activeIds = get().tasks
      .filter((t) => t.status === 'pending' || t.status === 'downloading')
      .map((t) => t.id)
    await Promise.all(activeIds.map((id) => window.api.cancelDownload(id)))
  },

  getActiveCount: () => {
    return get().tasks.filter(
      (t) => t.status === 'pending' || t.status === 'downloading'
    ).length
  }
}))
