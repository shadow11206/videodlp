import { BrowserWindow, session } from 'electron'
import type { VideoInfo } from '@shared/types'
import { join } from 'path'
import { homedir } from 'os'
import { execFileSync } from 'child_process'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

async function loadFirefoxCookies(): Promise<{ name: string; value: string; domain: string }[]> {
  const dbPath = join(homedir(), 'Library/Application Support/Firefox/Profiles')
  const { readdirSync, existsSync } = await import('fs')
  const profiles = readdirSync(dbPath).filter(f => f.endsWith('.default-release') || f.endsWith('.default'))
  let cookiesDb = ''
  for (const p of profiles) {
    const db = join(dbPath, p, 'cookies.sqlite')
    if (existsSync(db)) { cookiesDb = db; break }
  }
  if (!cookiesDb) return []

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

function extractVideoId(url: string): string | null {
  const vidMatch = url.match(/(?:video|note)\/(\d{10,})/)
  if (vidMatch) return vidMatch[1]
  const modalMatch = url.match(/modal_id=(\d{10,})/)
  if (modalMatch) return modalMatch[1]
  return null
}

export async function resolveDouyin(url: string): Promise<VideoInfo> {
  const videoId = extractVideoId(url)
  if (!videoId) throw new Error('无法提取视频ID')

  const ses = session.fromPartition(`douyin_${Date.now()}`, { cache: false })

  const cookies = await loadFirefoxCookies()
  for (const c of cookies) {
    try {
      await ses.cookies.set({
        url: `https://${c.domain}`,
        name: c.name, value: c.value, domain: c.domain,
        path: '/', secure: true, httpOnly: false
      } as any)
    } catch { /* skip */ }
  }

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 400, height: 800, show: false,
      webPreferences: { session: ses, nodeIntegration: false, contextIsolation: true }
    })

    win.webContents.on('will-redirect', (_e, redirectUrl) => {
      if (/^(snssdk|aweme):\/\//.test(redirectUrl) || /openapp|ulink/i.test(redirectUrl)) _e.preventDefault()
    })
    win.webContents.on('will-navigate', (_e, navUrl) => {
      if (/^(snssdk|aweme):\/\//.test(navUrl) || /openapp|ulink/i.test(navUrl)) _e.preventDefault()
    })
    win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }))

    const timeout = setTimeout(() => {
      try { win.destroy() } catch { /* */ }
      reject(new Error('解析超时'))
    }, 25000)

    let finished = false
    const done = (info: VideoInfo) => {
      if (finished) return
      finished = true
      clearTimeout(timeout)
      try { win.destroy() } catch { /* */ }
      resolve(info)
    }

    win.webContents.on('did-finish-load', async () => {
      // 从页面上下文内用 fetch 调用 API（浏览器会自动带 Cookie，不依赖 X-Bogus 签名）
      for (let attempt = 0; attempt < 8; attempt++) {
        if (finished) return
        await new Promise(r => setTimeout(r, 2000))
        try {
          const result = await win.webContents.executeJavaScript(`
            (async function() {
              try {
                var resp = await fetch('/aweme/v1/web/aweme/detail/?aweme_id=${videoId}&aid=6383', { credentials: 'include' });
                var data = await resp.json();
                var d = data.aweme_detail;
                if (!d) return '';
                var vd = d.video;
                var vu = '';
                if (vd && vd.play_addr && vd.play_addr.url_list) {
                  vu = vd.play_addr.url_list[0].replace('/playwm/', '/play/');
                }
                return JSON.stringify({
                  title: d.desc || '抖音视频',
                  duration: vd ? vd.duration : 0,
                  uploader: d.author ? d.author.nickname : '',
                  thumbnail: (vd && vd.cover && vd.cover.url_list) ? vd.cover.url_list[0] : '',
                  videoUrl: vu
                });
              } catch(e) { return ''; }
            })()
          `)
          if (result && result.length > 10) {
            const d = JSON.parse(result)
            done({
              id: videoId,
              title: d.title,
              thumbnail: d.thumbnail,
              duration: Math.round((d.duration || 0) / 1000),
              uploader: d.uploader,
              webpageUrl: url,
              formats: [{ id: 'best', ext: 'mp4', resolution: '720p', fps: 30, fileSize: '未知', note: '' }],
              videoUrl: d.videoUrl || undefined
            })
            return
          }
        } catch { /* retry */ }
      }
      done({ id: videoId, title: '抖音视频(解析失败)', thumbnail: '', duration: 0, uploader: '', webpageUrl: url, formats: [] })
    })

    win.webContents.on('did-fail-load', (_e, _code, desc) => reject(new Error(`页面加载失败: ${desc}`)))
    win.loadURL(`https://www.douyin.com/video/${videoId}`, { userAgent: UA })
  })
}
