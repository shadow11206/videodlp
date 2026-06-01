import { ipcMain, dialog, shell } from 'electron'
import { writeFileSync } from 'fs'
import type { HistoryRecord, BatchGroup } from '@shared/types'
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

  ipcMain.handle('export:saveCsv', async (_e, defaultName: string, content: string) => {
    const result = await dialog.showSaveDialog({
      defaultPath: defaultName,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return false
    writeFileSync(result.filePath, '﻿' + content, 'utf-8')
    return true
  })

  ipcMain.handle('export:batchCsv', async (_e, batch: BatchGroup) => {
    const result = await dialog.showSaveDialog({
      defaultPath: `download-batch-${batch.batchId}.csv`,
      filters: [{ name: 'CSV', extensions: ['csv'] }]
    })
    if (result.canceled || !result.filePath) return false

    const header = '序号,链接,标题,状态\n'
    const rows = batch.records
      .map((r, i) => `${i + 1},"${r.url}","${r.title}","${r.status || '成功'}"`)
      .join('\n')
    writeFileSync(result.filePath, '﻿' + header + rows, 'utf-8')
    return true
  })
}
