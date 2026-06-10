import { app } from 'electron'
import { join } from 'path'
import { access } from 'fs/promises'
import { constants } from 'fs'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileP = promisify(execFile)

function ffmpegPath(): string {
  return join(app.getPath('userData'), 'ffmpeg')
}

const homebrewPaths = [
  '/opt/homebrew/bin/ffmpeg',
  '/usr/local/bin/ffmpeg'
]

async function tryPath(p: string): Promise<boolean> {
  try {
    await access(p, constants.X_OK)
    return true
  } catch {
    return false
  }
}

export async function getFfmpegLocation(): Promise<string | null> {
  // Check bundled ffmpeg first
  if (await tryPath(ffmpegPath())) return ffmpegPath()

  // Check common Homebrew paths (may not be in Electron's PATH)
  for (const p of homebrewPaths) {
    if (await tryPath(p)) return p
  }

  // Fall back to PATH search
  try {
    await execFileP('ffmpeg', ['-version'])
    return 'ffmpeg'
  } catch {
    return null
  }
}

export async function isFfmpegInstalled(): Promise<boolean> {
  return (await getFfmpegLocation()) !== null
}

export { ffmpegPath }
