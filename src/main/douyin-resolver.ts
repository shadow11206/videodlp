import { BrowserWindow, session } from 'electron'
import type { VideoInfo } from '@shared/types'
import { join } from 'path'
import { homedir } from 'os'
import { execFileSync } from 'child_process'

// 从 Firefox 数据库读取 douyin cookie
async function loadFirefoxCookies(): Promise<{ name: string; value: string; domain: string }[]> {
  const dbPath = join(
    homedir(),
    'Library/Application Support/Firefox/Profiles'
  )
  const { readdirSync, existsSync } = await import('fs')
  const profiles = readdirSync(dbPath).filter(f => f.endsWith('.default-release') || f.endsWith('.default'))
  // 找到第一个有 cookies.sqlite 的 profile
  let cookiesDb = ''
  for (const p of profiles) {
    const db = join(dbPath, p, 'cookies.sqlite')
    if (existsSync(db)) { cookiesDb = db; break }
  }
  if (!cookiesDb) return []

  // 用 Python 读 sqlite（Electron 环境里 sqlite3 不可靠）
  try {
    const result = execFileSync('python3', ['-c', `
import sqlite3, shutil, tempfile, os, json
src = ${JSON.stringify(cookiesDb)}
tmp = tempfile.NamedTemporaryFile(delete=False)
shutil.copy2(src, tmp.name)
conn = sqlite3.connect(tmp.name)
rows = conn.execute(
  "SELECT host, name, value FROM moz_cookies WHERE host LIKE '%douyin%' OR host LIKE '%iesdouyin%'"
).fetchall()
conn.close()
os.unlink(tmp.name)
print(json.dumps([{'domain': r[0], 'name': r[1], 'value': r[2]} for r in rows]))
`], { encoding: 'utf-8', timeout: 5000 })
    return JSON.parse(result.trim())
  } catch {
    return []
  }
}

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

function extractVideoId(url: string): string | null {
  const vidMatch = url.match(/(?:video|note)\/(\d{10,})/)
  if (vidMatch) return vidMatch[1]
  const modalMatch = url.match(/modal_id=(\d{10,})/)
  if (modalMatch) return modalMatch[1]
  return null
}

export async function resolveDouyin(url: string): Promise<VideoInfo> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new Error('无法从链接中提取视频ID')
  }

  // 创建临时 session 并注入 Firefox cookie
  const ses = session.fromPartition(`douyin_${Date.now()}`, { cache: false })

  const cookies = await loadFirefoxCookies()
  for (const c of cookies) {
    try {
      await ses.cookies.set({
        url: `https://${c.domain}`,
        name: c.name,
        value: c.value,
        domain: c.domain,
        path: '/',
        secure: true,
        httpOnly: false
      } as any)
    } catch { /* skip invalid cookies */ }
  }

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 400, height: 800,
      show: false,
      webPreferences: {
        session: ses,
        nodeIntegration: false,
        contextIsolation: true
      }
    })

    // 阻止跳转到 App 协议（snssdk1128:// 等）
    win.webContents.on('will-redirect', (_e, url) => {
      if (url.startsWith('snssdk') || url.startsWith('aweme://') || url.includes('//openapp') || url.includes('//ulink')) {
        _e.preventDefault()
      }
    })
    win.webContents.on('will-navigate', (_e, url) => {
      if (url.startsWith('snssdk') || url.startsWith('aweme://') || url.includes('//openapp') || url.includes('//ulink')) {
        _e.preventDefault()
      }
    })
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

    const timeout = setTimeout(() => {
      try { win.destroy() } catch { /* */ }
      reject(new Error('页面加载超时'))
    }, 20000)

    let finished = false

    const done = (info: VideoInfo) => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      try { win.destroy() } catch { /* */ }
      resolve(info)
    }

    win.webContents.on('did-finish-load', async () => {
      // 重试读取 RENDER_DATA（页面可能需要一点时间执行 JS）
      for (let i = 0; i < 8; i++) {
        await new Promise(r => setTimeout(r, 1500))
        if (finished) return
        try {
          const raw = await win.webContents.executeJavaScript(`
            (function() {
              try {
                var el = document.getElementById('RENDER_DATA');
                if (!el) return '';
                return el.textContent || '';
              } catch(e) { return ''; }
            })()
          `)
          if (raw && raw.length > 100) {
            try {
              const decoded = decodeURIComponent(raw)
              const data = JSON.parse(decoded)
              const key = Object.keys(data).find(k =>
                k.includes('video') || k.includes('aweme') || k.includes('detail')
              )
              if (key && data[key]) {
                const v = data[key]
                const vd = v.video
                let videoUrl = ''
                if (vd?.play_addr?.url_list?.length > 0) {
                  videoUrl = vd.play_addr.url_list[0]
                  videoUrl = videoUrl.replace('/playwm/', '/play/').replace('watermark=1', 'watermark=0')
                }
                done({
                  id: videoId,
                  title: v.desc || `抖音视频_${videoId}`,
                  thumbnail: vd?.cover?.url_list?.[0] || vd?.origin_cover?.url_list?.[0] || '',
                  duration: Math.round((v.duration || 0) / 1000),
                  uploader: v.author?.nickname || '',
                  webpageUrl: url,
                  formats: [{ id: 'best', ext: 'mp4', resolution: '720p', fps: 30, fileSize: '未知', note: '' }],
                  videoUrl
                })
                return
              }
            } catch { /* next retry */ }
          }
        } catch { /* retry */ }
      }
      done({ id: videoId, title: '抖音视频(解析失败)', thumbnail: '', duration: 0, uploader: '', webpageUrl: url, formats: [] })
    })

    win.webContents.on('did-fail-load', (_e, _code, desc) => {
      reject(new Error(`页面加载失败: ${desc}`))
    })

    win.loadURL(`https://m.douyin.com/share/video/${videoId}`, { userAgent: UA })
  })
}
