import Store from 'electron-store'
import type { AppSettings, HistoryRecord } from '@shared/types'

interface StoreSchema {
  settings: AppSettings
  history: HistoryRecord[]
}

const defaults: StoreSchema = {
  settings: {
    downloadPath: '',
    maxConcurrency: 3,
    language: 'zh-CN',
    theme: 'system',
    defaultQuality: ''
  },
  history: []
}

const store = new Store<StoreSchema>({ defaults })

export function getSettings(): AppSettings {
  return store.get('settings')
}

export function setSettings(partial: Partial<AppSettings>): AppSettings {
  const current = store.get('settings')
  const updated = { ...current, ...partial }
  store.set('settings', updated)
  return updated
}

export function getHistory(): HistoryRecord[] {
  return store.get('history')
}

export function addHistory(record: HistoryRecord): void {
  const history = store.get('history')
  history.unshift(record)
  store.set('history', history)
}

export function removeHistory(id: string): void {
  store.set('history', store.get('history').filter((r) => r.id !== id))
}

export function clearHistory(): void {
  store.set('history', [])
}
