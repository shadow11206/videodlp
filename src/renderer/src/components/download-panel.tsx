import { useState } from 'react'
import { ChevronDown, ChevronUp, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/stores/i18n'
import { useDownload } from '@/stores/download'

export function DownloadPanel() {
  const { t } = useI18n()
  const tasks = useDownload((s) => s.tasks)
  const [expanded, setExpanded] = useState(false)

  const activeTasks = tasks.filter(
    (t) => t.status === 'pending' || t.status === 'downloading'
  )

  if (activeTasks.length === 0) return null

  const downloadingCount = activeTasks.filter((t) => t.status === 'downloading').length
  const downloadingTasks = activeTasks.filter((t) => t.status === 'downloading')
  const aggregateProgress =
    downloadingTasks.length > 0
      ? downloadingTasks.reduce((sum, t) => sum + t.progress, 0) / downloadingTasks.length
      : 0

  const handleCancel = async (taskId: string) => {
    await window.api.cancelDownload(taskId)
  }

  return (
    <div className="border-t border-neutral-200/60 dark:border-neutral-800/60 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-xl">
      <button
        className="w-full flex items-center gap-2 px-4 h-8 text-[12px] text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100/50 dark:hover:bg-neutral-800/50 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#007AFF]" />
        <span className="flex-1 text-left">
          {t.bottomBar.downloading}: {downloadingCount}
          {activeTasks.length > downloadingCount && (
            <span className="text-neutral-400"> · {t.bottomBar.queued}: {activeTasks.length - downloadingCount}</span>
          )}
        </span>
        {downloadingTasks.length > 0 && (
          <Progress value={aggregateProgress} className="w-24" />
        )}
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5" />
        ) : (
          <ChevronUp className="w-3.5 h-3.5" />
        )}
      </button>

      {expanded && (
        <div className="max-h-[200px] border-t border-neutral-200/40 dark:border-neutral-800/40">
          <ScrollArea className="max-h-[200px]">
            <div className="flex flex-col gap-1 p-2">
              {activeTasks.map((task) => (
                <div
                  key={task.id}
                  className="flex items-center gap-3 px-3 py-2 rounded-mac bg-neutral-50/50 dark:bg-neutral-800/50"
                >
                  <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                    <span className="text-[12px] font-medium truncate">
                      {task.title}
                    </span>
                    <div className="flex items-center gap-3 text-[11px] text-neutral-400">
                      {task.status === 'downloading' && (
                        <>
                          <Progress value={task.progress} className="flex-1 max-w-[120px]" />
                          {task.speed && <span>{task.speed}</span>}
                          {task.eta && <span>{task.eta}</span>}
                        </>
                      )}
                      {task.status === 'pending' && (
                        <span>{t.downloader.queued}</span>
                      )}
                    </div>
                  </div>
                  {task.status === 'downloading' && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0 flex-shrink-0"
                      onClick={() => handleCancel(task.id)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>
      )}
    </div>
  )
}
