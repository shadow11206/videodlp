import { useCallback, useRef, useState, useEffect } from 'react'
import { Link, X, ArrowDown, Clock, User, FileVideo, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { useI18n } from '@/stores/i18n'
import { useDownload } from '@/stores/download'
import { useDownloader } from '@/stores/downloader'
import { formatDuration } from '@/lib/utils'

export function Downloader() {
  const { t } = useI18n()
  const { tasks, addTask } = useDownload()

  const linkText = useDownloader((s) => s.linkText)
  const results = useDownloader((s) => s.results)
  const selectedFormat = useDownloader((s) => s.selectedFormat)
  const fetching = useDownloader((s) => s.fetching)
  const error = useDownloader((s) => s.error)
  const setLinkText = useDownloader((s) => s.setLinkText)
  const setResults = useDownloader((s) => s.setResults)
  const setSelectedFormat = useDownloader((s) => s.setSelectedFormat)
  const setFetching = useDownloader((s) => s.setFetching)
  const setError = useDownloader((s) => s.setError)
  const removeUrl = useDownloader((s) => s.removeUrl)

  const links = linkText
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  const cancelFetchRef = useRef(false)

  const PAGE_SIZE = 10
  const [currentPage, setCurrentPage] = useState(1)

  useEffect(() => {
    setCurrentPage(1)
  }, [links.length])

  const allUrls = links
  const totalPages = Math.max(1, Math.ceil(allUrls.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedUrls = allUrls.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const goToPage = useCallback((p: number) => {
    setCurrentPage(Math.max(1, Math.min(p, totalPages)))
  }, [totalPages])

  const handleRemoveUrl = useCallback((url: string) => {
    removeUrl(url)
    const lines = linkText.split('\n')
    const newText = lines.filter((l) => l.trim() !== url).join('\n')
    setLinkText(newText)
  }, [linkText, removeUrl, setLinkText])

  const handleFetchInfo = useCallback(async () => {
    if (links.length === 0) return
    cancelFetchRef.current = false
    setFetching(true)
    setError('')

    for (const url of links) {
      if (cancelFetchRef.current) break
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

  const handleCancelFetch = useCallback(() => {
    cancelFetchRef.current = true
    setFetching(false)
  }, [setFetching])

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
    <div className="flex flex-col flex-1 gap-4 min-h-0">
      <div className="flex flex-col gap-2 flex-shrink-0">
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
            onClick={fetching ? handleCancelFetch : handleFetchInfo}
            disabled={!fetching && links.length === 0}
            variant={fetching ? 'destructive' : 'default'}
          >
            <Link className="w-4 h-4 mr-1.5" />
            {fetching ? t.downloader.cancelFetch : t.downloader.fetchInfo}
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

      <div className="flex-1 min-h-0 overflow-y-auto">
        <div className="flex flex-col gap-4 pb-4">
          {paginatedUrls.map((url) => {
            const info = results.get(url)
            const taskForUrl = tasks.find((t) => t.url === url)

            if (info === null) {
              return (
                <Card key={url} className="border-[#FF3B30]/30">
                  <CardContent className="flex items-center gap-3 py-3">
                    <span className="text-[13px] text-[#FF3B30] flex-1 truncate">{url}</span>
                    <Badge variant="destructive">{t.downloader.fetchError}</Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 w-7 p-0 flex-shrink-0 text-neutral-400 hover:text-[#FF3B30]"
                      onClick={() => handleRemoveUrl(url)}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
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
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[13px] font-medium leading-tight line-clamp-2 flex-1">
                          {info.title}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 flex-shrink-0 text-neutral-300 hover:text-[#FF3B30]"
                          onClick={() => handleRemoveUrl(url)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
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

          {allUrls.length === 0 && tasks.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-300 dark:text-neutral-600">
              <FileVideo className="w-12 h-12" />
              <span className="text-[13px]">{t.downloader.noTasks}</span>
            </div>
          )}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-1 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={safePage <= 1}
                onClick={() => goToPage(safePage - 1)}
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </Button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <Button
                  key={p}
                  variant={p === safePage ? 'default' : 'ghost'}
                  size="sm"
                  className="h-7 w-7 text-xs p-0"
                  onClick={() => goToPage(p)}
                >
                  {p}
                </Button>
              ))}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                disabled={safePage >= totalPages}
                onClick={() => goToPage(safePage + 1)}
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
              <span className="text-[11px] text-neutral-400 ml-2">
                {allUrls.length} 个 · {totalPages} 页
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
