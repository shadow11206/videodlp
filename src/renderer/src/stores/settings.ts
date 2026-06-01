import { create } from 'zustand'
import type { AppSettings } from '@shared/types'

const defaults: AppSettings = {
  downloadPath: '',
  maxConcurrency: 5,
  language: 'zh-CN',
  theme: 'system',
  defaultQuality: '',
  useAria2c: false,
  cookieBrowser: ''
}

interface SettingsState extends AppSettings {
  loaded: boolean
  load: () => Promise<void>
  update: (partial: Partial<AppSettings>) => Promise<void>
  setDownloadPath: (path: string) => Promise<void>
}

export const useSettings = create<SettingsState>((set) => ({
  ...defaults,
  loaded: false,

  load: async () => {
    const s = await window.api.getSettings()
    set({ ...s, loaded: true })
  },

  update: async (partial) => {
    await window.api.setSettings(partial)
    set(partial)
  },

  setDownloadPath: async (path: string) => {
    await window.api.setSettings({ downloadPath: path })
    set({ downloadPath: path })
  }
}))
