import { create } from 'zustand'
import type { DownloadTask } from '@shared/types'

interface DownloadState {
  tasks: DownloadTask[]
  addTask: (task: DownloadTask) => void
  updateTask: (task: DownloadTask) => void
  removeTask: (id: string) => void
  getActiveCount: () => number
}

export const useDownload = create<DownloadState>((set, get) => ({
  tasks: [],

  addTask: (task) => {
    set((s) => ({ tasks: [...s.tasks, task] }))
  },

  updateTask: (updated) => {
    set((s) => ({
      tasks: s.tasks.map((t) => (t.id === updated.id ? updated : t))
    }))
  },

  removeTask: (id) => {
    set((s) => ({ tasks: s.tasks.filter((t) => t.id !== id) }))
  },

  getActiveCount: () => {
    return get().tasks.filter(
      (t) => t.status === 'pending' || t.status === 'downloading'
    ).length
  }
}))
