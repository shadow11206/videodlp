import { BrowserWindow } from 'electron'
import type { VideoInfo } from '@shared/types'

export async function resolveDouyin(url: string): Promise<VideoInfo> {
  const vidMatch = url.match(/video\/(\d+)/)
  const modalMatch = url.match(/modal_id=(\d+)/)
  const videoId = vidMatch?.[1] || modalMatch?.[1]

  const shareUrl = videoId
    ? `https://m.douyin.com/share/video/${videoId}`
    : url

  return new Promise((resolve, reject) => {
    const win = new BrowserWindow({
      width: 400, height: 800,
      show: false,
      webPreferences: { nodeIntegration: false, contextIsolation: true }
    })

    const timeout = setTimeout(() => {
      win.destroy()
      reject(new Error('抖音页面加载超时'))
    }, 30000)

    let resolved = false

    const finish = (info: VideoInfo) => {
      if (resolved) return
      resolved = true
      clearTimeout(timeout)
      try { win.destroy() } catch { /* ignore */ }
      resolve(info)
    }

    win.webContents.on('did-finish-load', async () => {
      // page may need JS execution time, retry a few times
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise(r => setTimeout(r, 1000))
        try {
          const result = await win.webContents.executeJavaScript(`
            (function() {
              try {
                var el = document.getElementById('RENDER_DATA');
                if (!el) return '';
                var data = JSON.parse(el.textContent || '{}');
                var v = data['app/video'] || data['app/video_(id)/page'] || data['app/aweme'] || data['app/detail'];
                if (v) {
                  var videoUrl = '';
                  if (v.video && v.video.play_addr && v.video.play_addr.url_list) videoUrl = v.video.play_addr.url_list[0];
                  if (!videoUrl && v.video && v.video.download_addr && v.video.download_addr.url_list) videoUrl = v.video.download_addr.url_list[0];
                  return JSON.stringify({
                    title: v.desc || '',
                    thumbnail: v.video && v.video.cover && v.video.cover.url_list ? v.video.cover.url_list[0] : '',
                    duration: v.duration || 0,
                    uploader: v.author ? v.author.nickname : '',
                    videoUrl: videoUrl
                  });
                }
              } catch(e) {}
              return '';
            })()
          `)
          if (result) {
            const data = JSON.parse(result)
            finish({
              id: videoId || Date.now().toString(),
              title: data.title || '抖音视频',
              thumbnail: data.thumbnail || '',
              duration: Math.round((data.duration || 0) / 1000),
              uploader: data.uploader || '',
              webpageUrl: url,
              formats: [{ id: 'best', ext: 'mp4', resolution: '720p', fps: 30, fileSize: '未知', note: '直接下载' }],
              videoUrl: data.videoUrl || undefined
            })
            return
          }
        } catch { /* retry */ }
      }
      finish({ id: videoId || '', title: '抖音视频(需登录)', thumbnail: '', duration: 0, uploader: '', webpageUrl: url, formats: [] })
    })

    win.webContents.on('did-fail-load', (_e, _code, desc) => {
      reject(new Error(`页面加载失败: ${desc}`))
    })

    win.loadURL(shareUrl, { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1' })
  })
}
