import { app } from 'electron'
import { join } from 'path'
import { execFile, execSync } from 'child_process'
import { promisify } from 'util'
import { createWriteStream } from 'fs'
import { get } from 'https'
import { chmod, access, constants, mkdir, unlink } from 'fs/promises'

const execFileP = promisify(execFile)

const ARIA2_VERSION = '1.37.0'
const ARCH = process.arch === 'arm64' ? 'aarch64' : 'x86_64'
const ARIA2_URL = `https://github.com/aria2/aria2/releases/download/release-${ARIA2_VERSION}/aria2-${ARIA2_VERSION}-${ARCH}-apple-darwin.tar.xz`

function aria2Path(): string {
  return join(app.getPath('userData'), 'aria2c')
}

export async function isAria2Installed(): Promise<boolean> {
  try {
    await access(aria2Path(), constants.X_OK)
    return true
  } catch {
    return false
  }
}

export async function getAria2Version(): Promise<string> {
  const { stdout } = await execFileP(aria2Path(), ['--version'])
  return stdout.split('\n')[0].trim()
}

export async function downloadAria2(onProgress?: (pct: number) => void): Promise<void> {
  const dest = aria2Path()
  const tempArchive = dest + '.tar.xz'
  const dir = app.getPath('userData')
  await mkdir(dir, { recursive: true })

  await new Promise<void>((resolve, reject) => {
    const file = createWriteStream(tempArchive)
    get(ARIA2_URL, (response) => {
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

  try {
    execSync(`tar -xJf "${tempArchive}" -C "${dir}"`, { stdio: 'ignore' })
    const extractedBinary = join(dir, 'aria2c')
    await chmod(extractedBinary, 0o755)
    await unlink(tempArchive)
  } catch (err) {
    await unlink(tempArchive).catch(() => {})
    throw new Error('Failed to extract aria2c binary')
  }
}

export { aria2Path }
