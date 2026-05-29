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
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
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
  // /video/1234567890123456789
  const vidMatch = url.match(/(?:video|note)\/(\d{10,})/)
  if (vidMatch) return vidMatch[1]
  // ?modal_id=1234567890123456789
  const modalMatch = url.match(/modal_id=(\d{10,})/)
  if (modalMatch) return modalMatch[1]
  return null
}

async function fetchViaDouyinApi(videoId: string): Promise<VideoInfo> {
  // Try douyin.com API with mobile UA header
  const { body } = await httpsGet(
    `https://www.douyin.com/aweme/v1/web/aweme/detail/?aweme_id=${videoId}&aid=6383`,
    'https://www.douyin.com/'
  )

  const data = JSON.parse(body)

  if (data.status_code !== 0 || !data.aweme_detail) {
    throw new Error(data.status_msg || '抖音API返回错误')
  }

  const detail = data.aweme_detail
  const videoData = detail?.video
  const author = detail?.author

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
    title: detail?.desc || `抖音视频_${videoId}`,
    thumbnail: videoData?.cover?.url_list?.[0] || videoData?.origin_cover?.url_list?.[0] || '',
    duration: Math.round((videoData?.duration || 0) / 1000),
    uploader: author?.nickname || '',
    webpageUrl: `https://www.douyin.com/video/${videoId}`,
    formats,
    videoUrl
  }
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

  return fetchViaDouyinApi(videoId)
}
