export interface VideoFormat {
  id: string
  ext: string
  resolution: string
  fps: number
  fileSize: string
  note: string
}

export interface VideoInfo {
  id: string
  title: string
  thumbnail: string
  duration: number
  uploader: string
  webpageUrl: string
  formats: VideoFormat[]
}

export type DownloadStatus =
  | 'pending'
  | 'fetching_info'
  | 'ready'
  | 'downloading'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface DownloadTask {
  id: string
  url: string
  title: string
  status: DownloadStatus
  progress: number
  speed: string
  eta: string
  filePath: string
  formatId: string
  error: string
  createdAt: number
  batchId?: string
}

export interface HistoryRecord {
  id: string
  url: string
  title: string
  filePath: string
  fileSize: string
  formatId: string
  thumbnail: string
  duration: number
  completedAt: number
  batchId: string
  status: string
}

export interface DeletedRecord extends HistoryRecord {
  deletedAt: number
  trashPath: string
}

export interface BatchGroup {
  batchId: string
  records: HistoryRecord[]
  startTime: number
  endTime: number
  totalCount: number
  successCount: number
  failCount: number
}

export interface AppSettings {
  downloadPath: string
  maxConcurrency: number
  language: 'zh-CN' | 'en-US'
  theme: 'system' | 'light' | 'dark'
  defaultQuality: string
  useAria2c: boolean
}

export interface IpcApi {
  getVideoInfo: (url: string) => Promise<VideoInfo>
  startDownload: (url: string, formatId: string) => Promise<string>
  cancelDownload: (taskId: string) => Promise<void>
  onDownloadProgress: (callback: (task: DownloadTask) => void) => () => void
  getSettings: () => Promise<AppSettings>
  setSettings: (settings: Partial<AppSettings>) => Promise<void>
  getHistory: () => Promise<HistoryRecord[]>
  addHistory: (record: HistoryRecord) => Promise<void>
  removeHistory: (id: string) => Promise<void>
  clearHistory: () => Promise<void>
  checkYtDlp: () => Promise<{ installed: boolean; version: string }>
  updateYtDlp: () => Promise<string>
  selectDirectory: () => Promise<string | null>
  openFileLocation: (filePath: string) => Promise<void>
  exportBatchCsv: (batch: BatchGroup) => Promise<boolean>
  saveCsv: (defaultName: string, content: string) => Promise<boolean>
  moveToDeleted: (record: HistoryRecord) => Promise<void>
  getDeleted: () => Promise<DeletedRecord[]>
  restoreDeleted: (id: string) => Promise<void>
  permanentDeleteDeleted: (id: string) => Promise<void>
  clearDeleted: () => Promise<void>
  moveFileToTrash: (filePath: string) => Promise<string>
  restoreFileFromTrash: (trashPath: string, originalPath: string) => Promise<boolean>
  permanentDeleteTrashFile: (trashPath: string) => Promise<void>
  checkFileExists: (filePath: string) => Promise<boolean>
  checkAria2c: () => Promise<boolean>
}
