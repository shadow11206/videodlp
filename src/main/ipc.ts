import { ipcMain, dialog, shell } from 'electron'
import type { HistoryRecord } from '@shared/types'
import { getVideoInfo, isInstalled, getVersion, updateBinary } from './yt-dlp-manager'
import { createTask, cancelTask } from './download-engine'
import { getSettings, setSettings, getHistory, addHistory, removeHistory, clearHistory } from './store'

export function registerIpcHandlers(): void {
  ipcMain.handle('video:getInfo', async (_e, url: string) => {
    return getVideoInfo(url)
  })

  ipcMain.handle('download:start', async (_e, url: string, formatId: string) => {
    return createTask(url, formatId)
  })

  ipcMain.handle('download:cancel', async (_e, taskId: string) => {
    cancelTask(taskId)
  })

  ipcMain.handle('settings:get', async () => {
    return getSettings()
  })

  ipcMain.handle('settings:set', async (_e, partial: Record<string, unknown>) => {
    return setSettings(partial as any)
  })

  ipcMain.handle('history:get', async () => {
    return getHistory()
  })

  ipcMain.handle('history:add', async (_e, record: HistoryRecord) => {
    addHistory(record)
  })

  ipcMain.handle('history:remove', async (_e, id: string) => {
    removeHistory(id)
  })

  ipcMain.handle('history:clear', async () => {
    clearHistory()
  })

  ipcMain.handle('ytdlp:check', async () => {
    const installed = await isInstalled()
    const version = installed ? await getVersion() : ''
    return { installed, version }
  })

  ipcMain.handle('ytdlp:update', async () => {
    return updateBinary()
  })

  ipcMain.handle('dialog:selectDirectory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    })
    return result.canceled ? null : result.filePaths[0]
  })

  ipcMain.handle('shell:openFileLocation', async (_e, filePath: string) => {
    shell.showItemInFolder(filePath)
  })
}
