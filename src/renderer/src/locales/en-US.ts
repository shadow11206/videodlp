import type { Locale } from './zh-CN'

const enUS: Locale = {
  app: { title: 'VideoDLP' },
  nav: { downloader: 'Download', downloading: 'Downloading', library: 'Library', settings: 'Settings' },
  downloader: {
    inputPlaceholder: 'Paste video links, one per line...',
    fetchInfo: 'Fetch Info',
    batchCount: '{count} links added',
    title: 'Title',
    uploader: 'Uploader',
    duration: 'Duration',
    quality: 'Quality',
    download: 'Download',
    downloading: 'Downloading',
    queued: 'Queued',
    noTasks: 'No active tasks. Paste a link to start downloading.',
    speed: 'Speed',
    eta: 'ETA',
    cancel: 'Cancel',
    retry: 'Retry',
    unknown: 'Unknown',
    fileSize: 'Size',
    fetching: 'Fetching video info...',
    fetchError: 'Failed to fetch video info',
    cancelFetch: 'Cancel Fetch',
    cancelAll: 'Cancel All',
    noDownloading: 'No active downloads'
  },
  library: {
    completed: 'Completed',
    incomplete: 'Incomplete',
    noCompleted: 'No completed downloads yet',
    noIncomplete: 'No incomplete downloads',
    openFolder: 'Open Folder',
    delete: 'Delete',
    clearAll: 'Clear All',
    deleteSelected: 'Delete Selected ({count})',
    selectAll: 'Select All',
    deselectAll: 'Deselect All',
    downloadedAt: 'Downloaded',
    copyLink: 'Copy Link',
    batches: 'Batches',
    search: 'Search downloads...',
    noSearchResults: 'No matching videos',
    noBatches: 'No download batches',
    exportCsv: 'Export CSV'
  },
  settings: {
    title: 'Settings',
    downloadPath: 'Download Path',
    selectPath: 'Select Folder',
    maxConcurrency: 'Max Concurrent Downloads',
    language: 'Language',
    theme: 'Theme',
    themeSystem: 'System',
    themeLight: 'Light',
    themeDark: 'Dark',
    ytdlpStatus: 'yt-dlp Status',
    ytdlpInstalled: 'Installed',
    ytdlpNotInstalled: 'Not Installed',
    checkUpdate: 'Check for Update',
    updating: 'Updating...',
    version: 'Version',
    notSet: 'Not set',
    author: 'Author',
    github: 'GitHub'
  },
  bottomBar: {
    ready: 'Ready',
    downloading: 'Downloading',
    queued: 'Queued',
    notInstalled: 'yt-dlp not installed'
  }
}

export default enUS
