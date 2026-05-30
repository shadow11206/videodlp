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
}

export interface AppSettings {
  downloadPath: string
  maxConcurrency: number
  language: 'zh-CN' | 'en-US'
  theme: 'system' | 'light' | 'dark'
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
}
