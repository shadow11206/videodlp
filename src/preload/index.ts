import { contextBridge, ipcRenderer } from 'electron'
import type { IpcApi, DownloadTask } from '@shared/types'

const api: IpcApi = {
  getVideoInfo: (url) => ipcRenderer.invoke('video:getInfo', url),
  startDownload: (url, formatId, douyinVideoUrl) => ipcRenderer.invoke('download:start', url, formatId, douyinVideoUrl),
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
  openFileLocation: (fp) => ipcRenderer.invoke('shell:openFileLocation', fp)
}

contextBridge.exposeInMainWorld('api', api)
