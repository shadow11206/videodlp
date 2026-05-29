import { spawn, ChildProcess } from 'child_process'
import type { BrowserWindow } from 'electron'
import type { DownloadTask } from '@shared/types'
import { ytDlpPath } from './yt-dlp-manager'
import { getSettings as getStoreSettings } from './store'

let uidCounter = 0
const tasks = new Map<string, DownloadTask>()
const processes = new Map<string, ChildProcess>()
let mainWindow: BrowserWindow | null = null

export function setWindow(win: BrowserWindow): void {
  mainWindow = win
}

function pushProgress(task: DownloadTask): void {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('download:progress', { ...task })
  }
}

function getActiveCount(): number {
  let count = 0
  for (const t of tasks.values()) {
    if (t.status === 'fetching_info' || t.status === 'downloading') count++
  }
  return count
}

function scheduleNext(): void {
  const settings = getStoreSettings()
  const max = settings.maxConcurrency || 3
  for (const task of tasks.values()) {
    if (getActiveCount() >= max) break
    if (task.status === 'pending') {
      startDownload(task)
    }
  }
}

export function createTask(url: string, formatId: string): string {
  const id = `task_${Date.now()}_${++uidCounter}`
  const task: DownloadTask = {
    id,
    url,
    title: url,
    status: 'pending',
    progress: 0,
    speed: '',
    eta: '',
    filePath: '',
    formatId,
    error: '',
    createdAt: Date.now()
  }
  tasks.set(id, task)
  pushProgress(task)
  scheduleNext()
  return id
}

export function cancelTask(taskId: string): void {
  const proc = processes.get(taskId)
  if (proc) {
    proc.kill('SIGTERM')
    processes.delete(taskId)
  }
  const task = tasks.get(taskId)
  if (task && ['pending', 'downloading'].includes(task.status)) {
    task.status = 'cancelled'
    pushProgress(task)
  }
}

function startDownload(task: DownloadTask): void {
  task.status = 'downloading'
  task.progress = 0
  pushProgress(task)

  const settings = getStoreSettings()
  const outputTemplate = settings.downloadPath
    ? `${settings.downloadPath}/%(title)s.%(ext)s`
    : `%(title)s.%(ext)s`

  const args = [
    task.url,
    '--newline',
    '--no-playlist',
    '--no-check-certificate',
    '-o', outputTemplate
  ]
  if (task.formatId) {
    args.push('-f', task.formatId)
  }
  if (settings.cookieBrowser) {
    args.push('--cookies-from-browser', settings.cookieBrowser)
  }

  const proc = spawn(ytDlpPath(), args, { stdio: ['ignore', 'pipe', 'pipe'] })
  processes.set(task.id, proc)

  proc.stdout?.on('data', (data: Buffer) => {
    const lines = data.toString().split('\n').filter(Boolean)
    for (const line of lines) {
      const pctMatch = line.match(/(\d+\.?\d*)%/)
      if (pctMatch) task.progress = parseFloat(pctMatch[1])

      const speedMatch = line.match(/at\s+([\d.]+\s*\w+\/s)/)
      if (speedMatch) task.speed = speedMatch[1]

      const etaMatch = line.match(/ETA\s+(\S+)/)
      if (etaMatch) task.eta = etaMatch[1]

      const destMatch = line.match(/Destination:\s*(.+)$/)
      if (destMatch) task.filePath = destMatch[1].trim()

      if (line.includes('[download]')) pushProgress(task)
    }
  })

  proc.stderr?.on('data', (data: Buffer) => {
    const text = data.toString()
    if (text.includes('ERROR:')) {
      task.status = 'failed'
      task.error = text.trim().split('\n')[0]
      pushProgress(task)
    }
  })

  proc.on('close', (code) => {
    processes.delete(task.id)
    if (code === 0) {
      task.status = 'completed'
      task.progress = 100
    } else if (task.status !== 'cancelled' && task.status !== 'failed') {
      task.status = 'failed'
      task.error = `退出码: ${code}`
    }
    pushProgress(task)
    scheduleNext()
  })

  proc.on('error', (err) => {
    processes.delete(task.id)
    task.status = 'failed'
    task.error = err.message
    pushProgress(task)
    scheduleNext()
  })
}
