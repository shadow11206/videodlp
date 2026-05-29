import { useState, useEffect } from 'react'
import { FolderOpen, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { ScrollArea } from '@/components/ui/scroll-area'
import { useI18n } from '@/stores/i18n'
import { useHistory } from '@/stores/history'
import { useDownload } from '@/stores/download'
import { cn } from '@/lib/utils'

export function Library() {
  const { t } = useI18n()
  const { completed, load, remove, clearAll } = useHistory()
  const tasks = useDownload((s) => s.tasks)
  const [tab, setTab] = useState<'completed' | 'incomplete'>('completed')

  useEffect(() => { load() }, [load])

  const incompleteTasks = tasks.filter(
    (t) => t.status === 'failed' || t.status === 'cancelled'
  )

  const handleOpenFolder = (filePath: string) => {
    if (filePath) window.api.openFileLocation(filePath)
  }

  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
  }

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="flex items-center gap-1 border-b border-neutral-200/60 dark:border-neutral-800/60">
        <button
          className={cn(
            'px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[1px]',
            tab === 'completed'
              ? 'border-[#007AFF] text-[#007AFF]'
              : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
          )}
          onClick={() => setTab('completed')}
        >
          {t.library.completed}
        </button>
        <button
          className={cn(
            'px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[1px]',
            tab === 'incomplete'
              ? 'border-[#007AFF] text-[#007AFF]'
              : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
          )}
          onClick={() => setTab('incomplete')}
        >
          {t.library.incomplete}
        </button>
        {tab === 'completed' && completed.length > 0 && (
          <Button variant="ghost" size="sm" className="ml-auto text-xs text-neutral-400 hover:text-[#FF3B30]" onClick={clearAll}>
            <Trash2 className="w-3.5 h-3.5 mr-1" />
            {t.library.clearAll}
          </Button>
        )}
      </div>

      <ScrollArea className="flex-1">
        {tab === 'completed' && (
          <div className="flex flex-col gap-2 pb-4">
            {completed.length === 0 ? (
              <div className="text-center py-16 text-[13px] text-neutral-300 dark:text-neutral-600">
                {t.library.noCompleted}
              </div>
            ) : (
              completed.map((record) => (
                <Card key={record.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                      <span className="text-[13px] font-medium truncate">{record.title}</span>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        <span>{new Date(record.completedAt).toLocaleString()}</span>
                        {record.filePath && (
                          <span className="truncate max-w-[200px]">{record.filePath.split('/').pop()}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleCopyLink(record.url)}>
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenFolder(record.filePath)}>
                        <FolderOpen className="w-3.5 h-3.5 mr-1" />
                        {t.library.openFolder}
                      </Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-neutral-400 hover:text-[#FF3B30]" onClick={() => remove(record.id)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}

        {tab === 'incomplete' && (
          <div className="flex flex-col gap-2 pb-4">
            {incompleteTasks.length === 0 ? (
              <div className="text-center py-16 text-[13px] text-neutral-300 dark:text-neutral-600">
                {t.library.noIncomplete}
              </div>
            ) : (
              incompleteTasks.map((task) => (
                <Card key={task.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                      <span className="text-[13px] font-medium truncate">{task.title || task.url}</span>
                      <span className="text-[11px] text-neutral-400">
                        {task.status === 'failed' ? task.error : task.status}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        )}
      </ScrollArea>
    </div>
  )
}
