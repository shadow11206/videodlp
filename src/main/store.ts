import Store from 'electron-store'
import type { AppSettings, HistoryRecord, DeletedRecord } from '@shared/types'

interface StoreSchema {
  settings: AppSettings
  history: HistoryRecord[]
  deleted: DeletedRecord[]
}

const defaults: StoreSchema = {
  settings: {
    downloadPath: '',
    maxConcurrency: 3,
    language: 'zh-CN',
    theme: 'system',
    defaultQuality: ''
  },
  history: [],
  deleted: []
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

export function getDeleted(): DeletedRecord[] {
  return store.get('deleted')
}

export function moveToDeleted(record: HistoryRecord): void {
  const history = store.get('history').filter((r) => r.id !== record.id)
  store.set('history', history)
  const deleted = store.get('deleted')
  deleted.unshift({ ...record, deletedAt: Date.now() })
  store.set('deleted', deleted)
}

export function restoreDeleted(id: string): DeletedRecord | null {
  const deleted = store.get('deleted')
  const idx = deleted.findIndex((r) => r.id === id)
  if (idx === -1) return null
  const [record] = deleted.splice(idx, 1)
  store.set('deleted', deleted)
  const { deletedAt, ...historyRecord } = record
  const history = store.get('history')
  history.unshift(historyRecord)
  store.set('history', history)
  return record
}

export function permanentDeleteDeleted(id: string): void {
  store.set('deleted', store.get('deleted').filter((r) => r.id !== id))
}

export function clearDeleted(): void {
  store.set('deleted', [])
}
