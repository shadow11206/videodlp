import { create } from 'zustand'
import type { DownloadTask } from '@shared/types'

function generateBatchId(): string {
  return `batch_${Date.now()}`
}

interface DownloadState {
  tasks: DownloadTask[]
  currentBatchId: string
  addTask: (task: DownloadTask) => void
  updateTask: (task: DownloadTask) => void
  removeTask: (id: string) => void
  startNewBatch: () => string
  cancelAll: () => Promise<void>
  getActiveCount: () => number
}

export const useDownload = create<DownloadState>((set, get) => ({
  tasks: [],
  currentBatchId: generateBatchId(),

  startNewBatch: () => {
    const newId = generateBatchId()
    set({ currentBatchId: newId })
    return newId
  },

  addTask: (task) => {
    const batchId = get().currentBatchId
    set((s) => ({ tasks: [...s.tasks, { ...task, batchId }] }))
  },

  updateTask: (updated) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === updated.id ? { ...updated, batchId: t.batchId } : t))
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
