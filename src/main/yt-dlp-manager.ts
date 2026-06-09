import { app } from 'electron'
import { join } from 'path'
import { execFile } from 'child_process'
import { promisify } from 'util'
import { createWriteStream } from 'fs'
import { get } from 'https'
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

  const dir = app.getPath('userData')
  await mkdir(dir, { recursive: true })

  await new Promise<void>((resolve, reject) => {
    const file = createWriteStream(tempDest)
    const url = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_macos'
    get(url, (response) => {
      if (response.statusCode === 302 && response.headers.location) {
        get(response.headers.location, (rr) => {
          const total = parseInt(rr.headers['content-length'] || '0', 10)
          let downloaded = 0
          rr.on('data', (chunk: Buffer) => {
            downloaded += chunk.length
            if (total > 0 && onProgress) onProgress(Math.round((downloaded / total) * 100))
          })
          rr.pipe(file)
        }).on('error', reject)
        return
      }
      response.pipe(file)
    }).on('error', reject)
    file.on('finish', resolve)
  })

  await chmod(tempDest, 0o755)
  await rename(tempDest, dest)
}

export async function updateBinary(): Promise<string> {
  const { stdout } = await execFileP(ytDlpPath(), ['-U'])
  return stdout.trim()
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

function isBilibili(url: string): boolean {
  return url.includes('bilibili.com')
}

export async function getVideoInfo(url: string): Promise<VideoInfo> {
  const args = [
    '--dump-json',
    '--no-playlist',
    '--no-check-certificate',
    '--add-header', `User-Agent:${UA}`
  ]
  if (isBilibili(url)) {
    args.push('--add-header', 'Referer:https://www.bilibili.com')
  }
  args.push(url)
  const { stdout } = await execFileP(ytDlpPath(), args)

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
