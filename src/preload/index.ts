import { contextBridge, ipcRenderer } from 'electron'
import type { IpcApi, DownloadTask } from '@shared/types'

const api: IpcApi = {
  getVideoInfo: (url) => ipcRenderer.invoke('video:getInfo', url),
  startDownload: (url, formatId) => ipcRenderer.invoke('download:start', url, formatId),
  cancelDownload: (taskId) => ipcRenderer.invoke('download:cancel', taskId),
  onDownloadProgress: (callback) => {
    const handler = (_e: Electron.IpcRendererEvent, task: DownloadTask) => callback(task)
    ipcRenderer.on('download:progress', handler)
    return () => { ipcRenderer.removeListener('download:progress', handler) }
  },
  getSettings: () => ipcRenderer.invoke('settings:get'),
  setSettings: (s) => ipcRenderer.invoke('settings:set', s),
  getHistory: () => ipcRenderer.invoke('history:get'),
  addHistory: (r) => ipcRenderer.invoke('history:add', r),
  removeHistory: (id) => ipcRenderer.invoke('history:remove', id),
  clearHistory: () => ipcRenderer.invoke('history:clear'),
  checkYtDlp: () => ipcRenderer.invoke('ytdlp:check'),
  updateYtDlp: () => ipcRenderer.invoke('ytdlp:update'),
  selectDirectory: () => ipcRenderer.invoke('dialog:selectDirectory'),
  openFileLocation: (fp) => ipcRenderer.invoke('shell:openFileLocation', fp),
  exportBatchCsv: (batch) => ipcRenderer.invoke('export:batchCsv', batch),
  saveCsv: (defaultName, content) => ipcRenderer.invoke('export:saveCsv', defaultName, content),
  moveToDeleted: (record) => ipcRenderer.invoke('history:moveToDeleted', record),
  getDeleted: () => ipcRenderer.invoke('history:getDeleted'),
  restoreDeleted: (id) => ipcRenderer.invoke('history:restoreDeleted', id),
  permanentDeleteDeleted: (id) => ipcRenderer.invoke('history:permanentDeleteDeleted', id),
  clearDeleted: () => ipcRenderer.invoke('history:clearDeleted'),
  moveFileToTrash: (filePath) => ipcRenderer.invoke('file:moveToTrash', filePath),
  restoreFileFromTrash: (trashPath, originalPath) => ipcRenderer.invoke('file:restoreFromTrash', trashPath, originalPath),
  permanentDeleteTrashFile: (trashPath) => ipcRenderer.invoke('file:permanentDeleteTrash', trashPath),
  checkFileExists: (filePath) => ipcRenderer.invoke('shell:checkFileExists', filePath)
}

contextBridge.exposeInMainWorld('api', api)
