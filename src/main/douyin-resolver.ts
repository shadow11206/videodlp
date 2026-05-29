import { get } from 'https'
import type { IncomingMessage } from 'http'
import type { VideoInfo } from '@shared/types'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

function httpsGet(url: string, referer?: string): Promise<{ body: string; status: number }> {
  const { hostname, pathname, search } = new URL(url)
  return new Promise((resolve, reject) => {
    const req = get({
      hostname,
      path: pathname + search,
      headers: {
        'User-Agent': UA,
        'Referer': referer || 'https://www.douyin.com/',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'zh-CN,zh;q=0.9'
      },
      timeout: 15000
    }, (res: IncomingMessage) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => resolve({ body, status: res.statusCode || 0 }))
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('请求超时')) })
  })
}

async function resolveShortUrl(shortUrl: string): Promise<string> {
  const { hostname, pathname, search } = new URL(shortUrl)
  return new Promise((resolve, reject) => {
    const req = get({
      hostname,
      path: pathname + search,
      headers: { 'User-Agent': UA },
      timeout: 10000
    }, (res: IncomingMessage) => {
      const location = res.headers.location as string
      if (location) {
        resolve(location)
      } else {
        reject(new Error('短链接重定向失败'))
      }
    })
    req.on('error', reject)
    req.on('timeout', () => { req.destroy(); reject(new Error('短链接解析超时')) })
  })
}

function extractVideoId(url: string): string | null {
  const vidMatch = url.match(/(?:video|note)\/(\d{10,})/)
  if (vidMatch) return vidMatch[1]
  const modalMatch = url.match(/modal_id=(\d{10,})/)
  if (modalMatch) return modalMatch[1]
  return null
}

function parsePageData(html: string): any {
  // 方法1: RENDER_DATA script tag (服务端渲染的数据)
  const renderMatch = html.match(/<script[^>]*id="RENDER_DATA"[^>]*>([^<]+)<\/script>/)
  if (renderMatch) {
    try {
      const decoded = decodeURIComponent(renderMatch[1])
      const data = JSON.parse(decoded)
      const key = Object.keys(data).find(k => k.includes('video') || k.includes('aweme') || k.includes('detail'))
      if (key && data[key]) return data[key]
    } catch { /* try next */ }
  }

  // 方法2: window._ROUTER_DATA
  const routerMatch = html.match(/window\._ROUTER_DATA\s*=\s*(\{.+?\});<\/script>/)
  if (routerMatch) {
    try {
      const data = JSON.parse(routerMatch[1])
      const pageData = data?.loaderData?.['video_(id)/page']
      if (pageData) return pageData
    } catch { /* try next */ }
  }

  // 方法3: videoInfo 变量
  const viMatch = html.match(/"videoInfo":\s*(\{[^}]+\})/)
  if (viMatch) {
    try {
      return JSON.parse(viMatch[1])
    } catch { /* try next */ }
  }

  return null
}

export async function resolveDouyin(url: string): Promise<VideoInfo> {
  // 短链接先展开
  let fullUrl = url
  if (url.includes('v.douyin.com') && !url.includes('/video/')) {
    fullUrl = await resolveShortUrl(url)
  }

  const videoId = extractVideoId(fullUrl)
  if (!videoId) {
    throw new Error(`无法识别视频ID，链接: ${fullUrl}`)
  }

  // 抓页面HTML，从内嵌数据中提取视频信息
  const { body: html } = await httpsGet(fullUrl)

  const pageData = parsePageData(html)
  if (!pageData) {
    throw new Error('无法解析抖音页面数据，可能需要登录。请尝试在Firefox登录douyin.com后重试')
  }

  const videoData = pageData?.video
  const author = pageData?.author

  let videoUrl = ''
  if (videoData?.play_addr?.url_list?.length > 0) {
    videoUrl = videoData.play_addr.url_list[0]
    videoUrl = videoUrl.replace('/playwm/', '/play/').replace('watermark=1', 'watermark=0')
  }

  const bitRates: any[] = videoData?.bit_rate || []
  const formats = bitRates.map((br, idx) => ({
    id: `bitrate_${idx}`,
    ext: 'mp4',
    resolution: br.gear_name || (idx === 0 ? '自适应' : '标清'),
    fps: 30,
    fileSize: (br.play_addr?.data_size || 0) > 0
      ? `${((br.play_addr?.data_size || 0) / 1024 / 1024).toFixed(1)} MB`
      : '未知',
    note: ''
  }))

  if (formats.length === 0) {
    formats.push({ id: 'default', ext: 'mp4', resolution: '720p', fps: 30, fileSize: '未知', note: '' })
  }

  return {
    id: videoId,
    title: pageData?.desc || `抖音视频_${videoId}`,
    thumbnail: videoData?.cover?.url_list?.[0] || videoData?.origin_cover?.url_list?.[0] || '',
    duration: Math.round((videoData?.duration || 0) / 1000),
    uploader: author?.nickname || '',
    webpageUrl: `https://www.douyin.com/video/${videoId}`,
    formats,
    videoUrl
  }
}
