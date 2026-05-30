import { useState, useEffect, useCallback } from 'react'
import { FolderOpen, Trash2, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from '@/stores/i18n'
import { useHistory } from '@/stores/history'
import { useDownload } from '@/stores/download'
import { cn } from '@/lib/utils'

export function Library() {
  const { t } = useI18n()
  const { completed, load, remove, removeBatch, clearAll } = useHistory()
  const tasks = useDownload((s) => s.tasks)
  const [tab, setTab] = useState<'completed' | 'incomplete'>('completed')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())

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

  const allSelected = completed.length > 0 && completed.every((r) => selectedIds.has(r.id))
  const someSelected = selectedIds.size > 0

  const handleSelectAll = useCallback(() => {
    if (allSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(completed.map((r) => r.id)))
    }
  }, [allSelected, completed])

  const handleToggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const handleDeleteSelected = useCallback(async () => {
    const ids = [...selectedIds]
    await removeBatch(ids)
    setSelectedIds(new Set())
  }, [selectedIds, removeBatch])

  const switchTab = useCallback((t: 'completed' | 'incomplete') => {
    setTab(t)
    setSelectedIds(new Set())
  }, [])

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-1 border-b border-neutral-200/60 dark:border-neutral-800/60">
        <button
          className={cn(
            'px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[1px]',
            tab === 'completed'
              ? 'border-[#007AFF] text-[#007AFF]'
              : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
          )}
          onClick={() => switchTab('completed')}
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
          onClick={() => switchTab('incomplete')}
        >
          {t.library.incomplete}
        </button>

        {tab === 'completed' && completed.length > 0 && (
          <>
            <button
              className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-2"
              onClick={handleSelectAll}
            >
              {allSelected ? t.library.deselectAll : t.library.selectAll}
            </button>
            <div className="ml-auto flex items-center gap-1">
              {someSelected && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-[#FF3B30] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10"
                  onClick={handleDeleteSelected}
                >
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {t.library.deleteSelected.replace('{count}', String(selectedIds.size))}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-neutral-400 hover:text-[#FF3B30]"
                onClick={() => { clearAll(); setSelectedIds(new Set()) }}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                {t.library.clearAll}
              </Button>
            </div>
          </>
        )}
      </div>

      {tab === 'completed' && (
        <div className="flex flex-col gap-2">
            {completed.length === 0 ? (
              <div className="text-center py-16 text-[13px] text-neutral-300 dark:text-neutral-600">
                {t.library.noCompleted}
              </div>
            ) : (
              completed.map((record) => (
                <Card key={record.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(record.id)}
                      onChange={() => handleToggleItem(record.id)}
                      className="w-4 h-4 rounded border-neutral-300 text-[#007AFF] focus:ring-[#007AFF] flex-shrink-0"
                    />
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
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleCopyLink(record.url)}
                      >
                        <Copy className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleOpenFolder(record.filePath)}
                      >
                        <FolderOpen className="w-3.5 h-3.5 mr-1" />
                        {t.library.openFolder}
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 text-xs text-neutral-400 hover:text-[#FF3B30]"
                        onClick={() => remove(record.id)}
                      >
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
    </div>
  )
}
