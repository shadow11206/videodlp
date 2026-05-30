import { create } from 'zustand'
import type { VideoInfo } from '@shared/types'

interface DownloaderState {
  linkText: string
  results: Map<string, VideoInfo | null>
  selectedFormat: Map<string, string>
  fetching: boolean
  error: string
  setLinkText: (text: string) => void
  setResults: (updater: (prev: Map<string, VideoInfo | null>) => Map<string, VideoInfo | null>) => void
  setSelectedFormat: (updater: (prev: Map<string, string>) => Map<string, string>) => void
  setFetching: (v: boolean) => void
  setError: (e: string) => void
  clearResults: () => void
}

export const useDownloader = create<DownloaderState>((set) => ({
  linkText: '',
  results: new Map(),
  selectedFormat: new Map(),
  fetching: false,
  error: '',

  setLinkText: (text) => set({ linkText: text }),

  setResults: (updater) =>
    set((s) => ({ results: updater(s.results) })),

  setSelectedFormat: (updater) =>
    set((s) => ({ selectedFormat: updater(s.selectedFormat) })),

  setFetching: (v) => set({ fetching: v }),

  setError: (e) => set({ error: e }),

  clearResults: () =>
    set({ results: new Map(), selectedFormat: new Map(), error: '', fetching: false })
}))
