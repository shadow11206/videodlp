import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FolderOpen, Trash2, Copy, Search, Download,
  ChevronDown, ChevronRight
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/stores/i18n'
import { useHistory } from '@/stores/history'
import { useDownload } from '@/stores/download'
import { cn } from '@/lib/utils'
import type { BatchGroup } from '@shared/types'

type TabType = 'completed' | 'batches' | 'incomplete'

export function Library() {
  const { t } = useI18n()
  const { completed, load, remove, removeBatch, clearAll } = useHistory()
  const tasks = useDownload((s) => s.tasks)
  const [tab, setTab] = useState<TabType>('completed')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())

  useEffect(() => { load() }, [load])

  const incompleteTasks = tasks.filter(
    (t) => t.status === 'failed' || t.status === 'cancelled'
  )

  const filteredCompleted = useMemo(() => {
    if (!searchQuery.trim()) return completed
    const q = searchQuery.toLowerCase()
    return completed.filter((r) => r.title.toLowerCase().includes(q))
  }, [completed, searchQuery])

  const batches = useMemo(() => {
    const map = new Map<string, BatchGroup>()
    for (const r of completed) {
      const bid = r.batchId || 'unknown'
      if (!map.has(bid)) {
        map.set(bid, {
          batchId: bid, records: [],
          startTime: r.completedAt, endTime: r.completedAt,
          totalCount: 0, successCount: 0, failCount: 0
        })
      }
      const g = map.get(bid)!
      g.records.push(r)
      g.startTime = Math.min(g.startTime, r.completedAt)
      g.endTime = Math.max(g.endTime, r.completedAt)
      g.totalCount++
      if (r.status === '失败') g.failCount++
      else g.successCount++
    }
    return [...map.values()].sort((a, b) => b.startTime - a.startTime)
  }, [completed])

  const handleOpenFolder = (filePath: string) => {
    if (filePath) window.api.openFileLocation(filePath)
  }
  const handleCopyLink = (url: string) => {
    navigator.clipboard.writeText(url)
  }

  const allSelected = filteredCompleted.length > 0 &&
    filteredCompleted.every((r) => selectedIds.has(r.id))
  const someSelected = selectedIds.size > 0

  const handleSelectAll = useCallback(() => {
    setSelectedIds(allSelected ? new Set() : new Set(filteredCompleted.map((r) => r.id)))
  }, [allSelected, filteredCompleted])

  const handleToggleItem = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }, [])

  const handleDeleteSelected = useCallback(async () => {
    await removeBatch([...selectedIds])
    setSelectedIds(new Set())
  }, [selectedIds, removeBatch])

  const switchTab = useCallback((t: TabType) => {
    setTab(t)
    setSelectedIds(new Set())
    setSearchQuery('')
  }, [])

  const toggleBatchExpand = useCallback((bid: string) => {
    setExpandedBatches((prev) => {
      const next = new Set(prev)
      next.has(bid) ? next.delete(bid) : next.add(bid)
      return next
    })
  }, [])

  const handleExportBatch = useCallback(async (batch: BatchGroup) => {
    await window.api.exportBatchCsv(batch)
  }, [])

  const fmtTime = (ts: number) => {
    const d = new Date(ts)
    return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200/60 dark:border-neutral-800/60">
        {(['completed', 'batches', 'incomplete'] as TabType[]).map((tb) => (
          <button
            key={tb}
            className={cn(
              'px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[1px]',
              tab === tb
                ? 'border-[#007AFF] text-[#007AFF]'
                : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300'
            )}
            onClick={() => switchTab(tb)}
          >
            {tb === 'completed' ? t.library.completed : tb === 'batches' ? t.library.batches : t.library.incomplete}
          </button>
        ))}
        {tab === 'completed' && filteredCompleted.length > 0 && (
          <>
            <button className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 ml-2" onClick={handleSelectAll}>
              {allSelected ? t.library.deselectAll : t.library.selectAll}
            </button>
            <div className="ml-auto flex items-center gap-1">
              {someSelected && (
                <Button variant="ghost" size="sm" className="text-xs text-[#FF3B30] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10" onClick={handleDeleteSelected}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />
                  {t.library.deleteSelected.replace('{count}', String(selectedIds.size))}
                </Button>
              )}
              <Button variant="ghost" size="sm" className="text-xs text-neutral-400 hover:text-[#FF3B30]" onClick={() => { clearAll(); setSelectedIds(new Set()) }}>
                <Trash2 className="w-3.5 h-3.5 mr-1" />{t.library.clearAll}
              </Button>
            </div>
          </>
        )}
      </div>

      {/* Completed tab */}
      {tab === 'completed' && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              className="w-full h-8 rounded-mac border border-neutral-200 bg-white/80 pl-8 pr-3 text-[13px] placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#007AFF] dark:border-neutral-700 dark:bg-neutral-800"
              placeholder={t.library.search}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          {filteredCompleted.length === 0 ? (
            <div className="text-center py-16 text-[13px] text-neutral-300 dark:text-neutral-600">
              {searchQuery ? t.library.noSearchResults : t.library.noCompleted}
            </div>
          ) : (
            filteredCompleted.map((record) => (
              <Card key={record.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <input type="checkbox" checked={selectedIds.has(record.id)} onChange={() => handleToggleItem(record.id)}
                    className="w-4 h-4 rounded border-neutral-300 text-[#007AFF] focus:ring-[#007AFF] flex-shrink-0" />
                  <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                    <span className="text-[13px] font-medium truncate">{record.title}</span>
                    <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                      <span>{new Date(record.completedAt).toLocaleString()}</span>
                      {record.filePath && <span className="truncate max-w-[200px]">{record.filePath.split('/').pop()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleCopyLink(record.url)}><Copy className="w-3 h-3" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenFolder(record.filePath)}><FolderOpen className="w-3.5 h-3.5 mr-1" />{t.library.openFolder}</Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs text-neutral-400 hover:text-[#FF3B30]" onClick={() => remove(record.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Batches tab */}
      {tab === 'batches' && (
        <div className="flex flex-col gap-2">
          {batches.length === 0 ? (
            <div className="text-center py-16 text-[13px] text-neutral-300 dark:text-neutral-600">{t.library.noBatches}</div>
          ) : (
            batches.map((batch) => {
              const expanded = expandedBatches.has(batch.batchId)
              return (
                <Card key={batch.batchId}>
                  <CardContent className="py-0 px-0">
                    <button className="w-full flex items-center gap-3 px-4 py-3 hover:bg-neutral-50/50 dark:hover:bg-neutral-800/50 transition-colors rounded-card" onClick={() => toggleBatchExpand(batch.batchId)}>
                      {expanded ? <ChevronDown className="w-4 h-4 text-neutral-400 flex-shrink-0" /> : <ChevronRight className="w-4 h-4 text-neutral-400 flex-shrink-0" />}
                      <div className="flex flex-col flex-1 min-w-0 gap-0.5 text-left">
                        <span className="text-[13px] font-medium">{fmtTime(batch.startTime)} ~ {fmtTime(batch.endTime)}</span>
                        <span className="text-[11px] text-neutral-400">{batch.totalCount} 条 · {batch.successCount} 成功{batch.failCount > 0 ? ` · ${batch.failCount} 失败` : ''}</span>
                      </div>
                      <Button variant="ghost" size="sm" className="h-7 text-xs flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleExportBatch(batch) }}>
                        <Download className="w-3.5 h-3.5 mr-1" />{t.library.exportCsv}
                      </Button>
                    </button>
                    {expanded && (
                      <div className="border-t border-neutral-200/40 dark:border-neutral-800/40 px-4 py-2">
                        {batch.records.map((r, i) => (
                          <div key={r.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                            <span className="text-[11px] text-neutral-400 w-6 flex-shrink-0">{i + 1}</span>
                            <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                              <span className="text-[12px] truncate">{r.title}</span>
                              <span className="text-[10px] text-neutral-400 truncate">{r.url}</span>
                            </div>
                            <Badge variant={r.status === '失败' ? 'destructive' : 'default'} className="flex-shrink-0">{r.status || '成功'}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })
          )}
        </div>
      )}

      {/* Incomplete tab */}
      {tab === 'incomplete' && (
        <div className="flex flex-col gap-2 pb-4">
          {incompleteTasks.length === 0 ? (
            <div className="text-center py-16 text-[13px] text-neutral-300 dark:text-neutral-600">{t.library.noIncomplete}</div>
          ) : (
            incompleteTasks.map((task) => (
              <Card key={task.id}>
                <CardContent className="flex items-center gap-3 py-3">
                  <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                    <span className="text-[13px] font-medium truncate">{task.title || task.url}</span>
                    <span className="text-[11px] text-neutral-400">{task.status === 'failed' ? task.error : task.status}</span>
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
