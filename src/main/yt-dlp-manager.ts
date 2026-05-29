import { app } from 'electron'
import { join } from 'path'
import { execFile, spawn } from 'child_process'
import { promisify } from 'util'
import { chmod, access, constants, rename, mkdir } from 'fs/promises'
import type { VideoInfo, VideoFormat } from '@shared/types'

const execFileP = promisify(execFile)

function ytDlpPath(): string {
  return join(app.getPath('userData'), 'yt-dlp_macos')
}

export async function isInstalled(): Promise<boolean> {
  try {
    await access(ytDlpPath(), constants.X_OK)
    return true
  } catch {
    return false
  }
}

export async function getVersion(): Promise<string> {
  const { stdout } = await execFileP(ytDlpPath(), ['--version'])
  return stdout.trim()
}

export async function downloadBinary(onProgress?: (pct: number) => void): Promise<void> {
  const dest = ytDlpPath()
  const tempDest = dest + '.tmp'
  const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'

  const dir = app.getPath('userData')
  await mkdir(dir, { recursive: true })

  await new Promise<void>((resolve, reject) => {
    const proc = spawn('curl', ['-L', '-o', tempDest, url], { stdio: 'ignore' })
    proc.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`curl exited with code ${code}`))
    })
    proc.on('error', reject)
  })

  await chmod(tempDest, 0o755)
  await rename(tempDest, dest)
}

export async function updateBinary(): Promise<string> {
  const { stdout } = await execFileP(ytDlpPath(), ['-U'])
  return stdout.trim()
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const { stdout } = await execFileP(ytDlpPath(), [
    '--dump-json',
    '--no-playlist',
    '--no-check-certificate',
    url
  ])

  const raw = JSON.parse(stdout)

  const formats: VideoFormat[] = []
  const seen = new Set<string>()
  for (const f of raw.formats || []) {
    if (f.vcodec === 'none') continue
    const resolution = f.resolution || f.format_note || 'unknown'
    if (seen.has(resolution)) continue
    seen.add(resolution)
    formats.push({
      id: f.format_id,
      ext: f.ext,
      resolution,
      fps: f.fps || 0,
      fileSize: f.filesize ? formatSize(f.filesize) : '未知',
      note: f.format_note || ''
    })
  }

  formats.sort((a, b) => {
    const na = parseInt(a.resolution) || 0
    const nb = parseInt(b.resolution) || 0
    return nb - na
  })

  return {
    id: raw.id || raw.display_id,
    title: raw.title,
    thumbnail: raw.thumbnail || raw.thumbnails?.[0]?.url || '',
    duration: raw.duration || 0,
    uploader: raw.uploader || raw.channel || '',
    webpageUrl: raw.webpage_url || url,
    formats
  }
}

function formatSize(bytes: number): string {
  const units = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[Math.min(i, units.length - 1)]}`
}

export { ytDlpPath }
