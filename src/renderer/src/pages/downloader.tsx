import { useState, useCallback, useEffect, useRef } from 'react'
import { Link, X, ArrowDown, Clock, User, FileVideo } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/stores/i18n'
import { useDownload } from '@/stores/download'
import { useHistory } from '@/stores/history'
import { formatDuration } from '@/lib/utils'
import type { VideoInfo, DownloadTask } from '@shared/types'

export function Downloader() {
  const { t } = useI18n()
  const { tasks, addTask, updateTask } = useDownload()
  const { add: addHistory } = useHistory()

  const [linkText, setLinkText] = useState('')
  const [results, setResults] = useState<Map<string, VideoInfo | null>>(new Map())
  const [selectedFormat, setSelectedFormat] = useState<Map<string, string>>(new Map())
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState('')
  const cleanupRef = useRef<(() => void) | null>(null)

  const links = linkText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  useEffect(() => {
    cleanupRef.current = window.api.onDownloadProgress((task: DownloadTask) => {
      updateTask(task)
      if (task.status === 'completed') {
        addHistory({
          id: task.id,
          url: task.url,
          title: task.title,
          filePath: task.filePath,
          fileSize: '',
          formatId: task.formatId,
          thumbnail: '',
          duration: 0,
          completedAt: Date.now()
        })
      }
    })
    return () => { cleanupRef.current?.() }
  }, [updateTask, addHistory])

  const handleFetchInfo = useCallback(async () => {
    if (links.length === 0) return
    setFetching(true)
    setError('')

    for (const url of links) {
      try {
        const info = await window.api.getVideoInfo(url)
        setResults((prev) => {
          const next = new Map(prev)
          next.set(url, info)
          return next
        })
        if (info.formats.length > 0) {
          const bestFormat = info.formats[0]
          const fmt = info.formats.find((f) => f.resolution === '1080p')
            || bestFormat
          setSelectedFormat((prev) => {
            const next = new Map(prev)
            next.set(url, fmt.id)
            return next
          })
        }
      } catch (err: any) {
        setResults((prev) => {
          const next = new Map(prev)
          next.set(url, null)
          return next
        })
        setError(err.message || t.downloader.fetchError)
      }
    }
    setFetching(false)
  }, [links.join('\n')])

  const handleDownload = useCallback(async (url: string) => {
    const fmtId = selectedFormat.get(url) || ''
    const info = results.get(url)
    const taskId = await window.api.startDownload(url, fmtId)
    addTask({
      id: taskId,
      url,
      title: info?.title || url,
      status: 'pending',
      progress: 0,
      speed: '',
      eta: '',
      filePath: '',
      formatId: fmtId,
      error: '',
      createdAt: Date.now()
    })
  }, [selectedFormat, results, addTask])

  const handleBatchDownload = useCallback(async () => {
    for (const url of links) {
      if (results.has(url) && results.get(url) !== null) {
        await handleDownload(url)
      }
    }
  }, [links, results, handleDownload])

  const handleCancel = useCallback(async (taskId: string) => {
    await window.api.cancelDownload(taskId)
  }, [])

  const readyLinks = links.filter((u) => results.has(u) && results.get(u) !== null)

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex flex-col gap-2">
        <div className="relative">
          <textarea
            className="flex w-full rounded-card border border-neutral-200/60 bg-white/70 px-4 py-3 text-[13px] shadow-sm resize-none placeholder:text-neutral-400 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF] dark:border-neutral-800/60 dark:bg-neutral-900/70"
            rows={3}
            placeholder={t.downloader.inputPlaceholder}
            value={linkText}
            onChange={(e) => setLinkText(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            onClick={handleFetchInfo}
            disabled={fetching || links.length === 0}
          >
            <Link className="w-4 h-4 mr-1.5" />
            {fetching ? t.downloader.fetching : t.downloader.fetchInfo}
          </Button>
          {readyLinks.length > 0 && (
            <Button size="sm" onClick={handleBatchDownload}>
              <ArrowDown className="w-4 h-4 mr-1.5" />
              {t.downloader.download} ({readyLinks.length})
            </Button>
          )}
          {links.length > 1 && (
            <span className="text-xs text-neutral-400">
              {t.downloader.batchCount.replace('{count}', String(links.length))}
            </span>
          )}
        </div>
        {error && (
          <p className="text-[13px] text-[#FF3B30]">{error}</p>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-4 pb-4">
          {links.map((url) => {
            const info = results.get(url)
            const taskForUrl = tasks.find((t) => t.url === url)

            if (info === undefined && !taskForUrl) return null

            if (info === null) {
              return (
                <Card key={url} className="border-[#FF3B30]/30">
                  <CardContent className="flex items-center gap-3 py-3">
                    <span className="text-[13px] text-[#FF3B30] flex-1 truncate">{url}</span>
                    <Badge variant="destructive">{t.downloader.fetchError}</Badge>
                  </CardContent>
                </Card>
              )
            }

            if (taskForUrl) {
              return (
                <Card key={url}>
                  <CardContent className="flex flex-col gap-2 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-[13px] font-medium truncate flex-1 mr-2">
                        {taskForUrl.title}
                      </span>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            taskForUrl.status === 'completed' ? 'default' :
                            taskForUrl.status === 'failed' ? 'destructive' :
                            taskForUrl.status === 'cancelled' ? 'secondary' :
                            'default'
                          }
                        >
                          {taskForUrl.status === 'downloading' ? `${taskForUrl.progress.toFixed(0)}%` :
                           taskForUrl.status === 'pending' ? t.downloader.queued :
                           taskForUrl.status}
                        </Badge>
                        {taskForUrl.status === 'downloading' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => handleCancel(taskForUrl.id)}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        )}
                        {taskForUrl.status === 'failed' && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 text-xs"
                            onClick={() => handleDownload(url)}
                          >
                            {t.downloader.retry}
                          </Button>
                        )}
                      </div>
                    </div>
                    {taskForUrl.status === 'downloading' && (
                      <div className="flex flex-col gap-1">
                        <Progress value={taskForUrl.progress} />
                        <div className="flex gap-4 text-[11px] text-neutral-400">
                          {taskForUrl.speed && <span>{t.downloader.speed}: {taskForUrl.speed}</span>}
                          {taskForUrl.eta && <span>{t.downloader.eta}: {taskForUrl.eta}</span>}
                        </div>
                      </div>
                    )}
                    {taskForUrl.error && (
                      <p className="text-[12px] text-[#FF3B30] truncate">{taskForUrl.error}</p>
                    )}
                  </CardContent>
                </Card>
              )
            }

            if (info) {
              const fmtId = selectedFormat.get(url) || info.formats[0]?.id || ''
              return (
                <Card key={url}>
                  <CardContent className="flex gap-3 py-3">
                    {info.thumbnail && (
                      <img
                        src={info.thumbnail}
                        alt=""
                        className="w-[120px] h-[68px] rounded-mac object-cover flex-shrink-0 bg-neutral-100 dark:bg-neutral-800"
                      />
                    )}
                    <div className="flex flex-col gap-1.5 flex-1 min-w-0">
                      <span className="text-[13px] font-medium leading-tight line-clamp-2">
                        {info.title}
                      </span>
                      <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                        {info.uploader && (
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3" /> {info.uploader}
                          </span>
                        )}
                        {info.duration > 0 && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {formatDuration(info.duration)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <select
                          className="h-7 rounded-md border border-neutral-200 bg-white/80 px-2 text-[12px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF] dark:border-neutral-700 dark:bg-neutral-800"
                          value={fmtId}
                          onChange={(e) => {
                            setSelectedFormat((prev) => {
                              const next = new Map(prev)
                              next.set(url, e.target.value)
                              return next
                            })
                          }}
                        >
                          {info.formats.map((f) => (
                            <option key={f.id} value={f.id}>
                              {f.resolution}{f.fps > 0 ? ` ${f.fps}fps` : ''} ({f.ext}){f.fileSize !== '未知' ? ` - ${f.fileSize}` : ''}
                            </option>
                          ))}
                        </select>
                        {fmtId && (
                          <Button
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => handleDownload(url)}
                          >
                            <ArrowDown className="w-3 h-3 mr-1" />
                            {t.downloader.download}
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )
            }

            return (
              <Card key={url}>
                <CardContent className="flex items-center gap-3 py-3">
                  <span className="text-[13px] text-neutral-500 flex-1 truncate">{url}</span>
                </CardContent>
              </Card>
            )
          })}

          {links.length === 0 && tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-300 dark:text-neutral-600">
              <FileVideo className="w-12 h-12" />
              <span className="text-[13px]">{t.downloader.noTasks}</span>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
