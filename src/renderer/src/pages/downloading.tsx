import { X, ArrowDown } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/stores/i18n'
import { useDownload } from '@/stores/download'

export function Downloading() {
  const { t } = useI18n()
  const { tasks, cancelAll } = useDownload()

  const activeTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'downloading'
  )

  const handleCancel = async (taskId: string) => {
    await window.api.cancelDownload(taskId)
  }

  return (
    <div className="flex flex-col h-full gap-4 min-h-0">
      <div className="flex items-center justify-between">
        <h1 className="text-[17px] font-semibold">
          {t.nav.downloading}
          {activeTasks.length > 0 && (
            <span className="text-neutral-400 text-[15px] ml-2 font-normal">
              {activeTasks.length}
            </span>
          )}
        </h1>
        {activeTasks.length > 0 && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-neutral-400 hover:text-[#FF3B30]"
            onClick={cancelAll}
          >
            <X className="w-3.5 h-3.5 mr-1" />
            {t.downloader.cancelAll}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        <div className="flex flex-col gap-3 pb-4">
          {activeTasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-neutral-300 dark:text-neutral-600">
              <ArrowDown className="w-12 h-12" />
              <span className="text-[13px]">{t.downloader.noDownloading}</span>
            </div>
          ) : (
            activeTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="flex flex-col gap-2 py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0 mr-2">
                      <span className="text-[13px] font-medium truncate block">
                        {task.title}
                      </span>
                      <span className="text-[11px] text-neutral-400 truncate block mt-0.5">
                        {task.url}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant={task.status === 'downloading' ? 'default' : 'secondary'}
                      >
                        {task.status === 'downloading'
                          ? `${task.progress.toFixed(0)}%`
                          : t.downloader.queued}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0"
                        onClick={() => handleCancel(task.id)}
                      >
                        <X className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                  {task.status === 'downloading' && (
                    <div className="flex flex-col gap-1">
                      <Progress value={task.progress} />
                      <div className="flex gap-4 text-[11px] text-neutral-400">
                        {task.speed && (
                          <span>{t.downloader.speed}: {task.speed}</span>
                        )}
                        {task.eta && (
                          <span>{t.downloader.eta}: {task.eta}</span>
                        )}
                      </div>
                    </div>
                  )}
                  {task.error && (
                    <p className="text-[12px] text-[#FF3B30] truncate">{task.error}</p>
                  )}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
