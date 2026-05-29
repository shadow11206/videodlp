import { net } from 'electron'
import type { VideoInfo } from '@shared/types'

const UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

async function httpGetJson(url: string, referer: string): Promise<any> {
  return new Promise((resolve, reject) => {
    const req = net.request({ url, redirect: 'follow' })
    req.setHeader('User-Agent', UA)
    req.setHeader('Referer', referer)
    req.setHeader('Accept', 'application/json, text/plain, */*')

    req.on('response', (res) => {
      let body = ''
      res.on('data', (chunk: Buffer) => { body += chunk.toString() })
      res.on('end', () => {
        try {
          resolve(JSON.parse(body))
        } catch {
          reject(new Error(`响应解析失败: ${body.slice(0, 200)}`))
        }
      })
    })
    req.on('error', reject)
    req.end()
  })
}

function extractVideoId(url: string): string | null {
  const vidMatch = url.match(/video\/(\d{10,})/)
  if (vidMatch) return vidMatch[1]
  const modalMatch = url.match(/modal_id=(\d{10,})/)
  if (modalMatch) return modalMatch[1]
  return null
}

export async function resolveDouyin(url: string): Promise<VideoInfo> {
  const videoId = extractVideoId(url)
  if (!videoId) {
    throw new Error('无法从链接中提取视频ID，请确认链接格式正确')
  }

  // 直接调抖音移动端 API，不需要浏览器和 Cookie
  const data = await httpGetJson(
    `https://www.iesdouyin.com/web/api/v2/aweme/iteminfo/?item_ids=${videoId}`,
    'https://www.douyin.com/'
  )

  const items = data?.item_list || []
  if (items.length === 0) {
    throw new Error('抖音返回空数据，请确认链接正确或稍后重试')
  }

  const video = items[0]
  const videoData = video?.video
  const author = video?.author

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
    formats.push({
      id: 'default', ext: 'mp4', resolution: '720p', fps: 30, fileSize: '未知', note: ''
    })
  }

  return {
    id: videoId,
    title: video?.desc || `抖音视频_${videoId}`,
    thumbnail: videoData?.cover?.url_list?.[0] || videoData?.origin_cover?.url_list?.[0] || '',
    duration: Math.round((videoData?.duration || 0) / 1000),
    uploader: author?.nickname || '',
    webpageUrl: `https://www.douyin.com/video/${videoId}`,
    formats,
    videoUrl
  }
}
