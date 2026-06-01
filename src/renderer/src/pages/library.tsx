import { useState, useEffect, useCallback, useMemo } from 'react'
import {
  FolderOpen, Trash2, Copy, Search, Download,
  ChevronDown, ChevronRight, Undo2, FileX,
  ChevronLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useI18n } from '@/stores/i18n'
import { useHistory } from '@/stores/history'
import { useDownload } from '@/stores/download'
import { cn } from '@/lib/utils'
import type { BatchGroup } from '@shared/types'

const PAGE_SIZE = 10
type TabType = 'completed' | 'batches' | 'incomplete' | 'deleted'

export function Library() {
  const { t } = useI18n()
  const {
    completed, deleted, load, loadDeleted,
    remove, removeWithFile, removeBatch, removeBatchWithFile,
    restoreDeleted, restoreAllDeleted, permanentDeleteDeleted, clearDeleted
  } = useHistory()
  const tasks = useDownload((s) => s.tasks)
  const [tab, setTab] = useState<TabType>('completed')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedBatches, setExpandedBatches] = useState<Set<string>>(new Set())
  const [currentPage, setCurrentPage] = useState(1)
  const [delCurrentPage, setDelCurrentPage] = useState(1)

  useEffect(() => { load() }, [load])
  useEffect(() => {
    if (tab === 'deleted') loadDeleted()
  }, [tab, loadDeleted])

  const incompleteTasks = tasks.filter((t) => t.status === 'failed' || t.status === 'cancelled')

  const filteredCompleted = useMemo(() => {
    if (!searchQuery.trim()) return completed
    const q = searchQuery.toLowerCase()
    return completed.filter((r) => r.title.toLowerCase().includes(q) || r.url.toLowerCase().includes(q))
  }, [completed, searchQuery])

  const totalPages = Math.max(1, Math.ceil(filteredCompleted.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedCompleted = filteredCompleted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)
  const allOnPage = paginatedCompleted.length > 0 && paginatedCompleted.every((r) => selectedIds.has(r.id))

  const delTotalPages = Math.max(1, Math.ceil(deleted.length / PAGE_SIZE))
  const delSafePage = Math.min(delCurrentPage, delTotalPages)
  const paginatedDeleted = deleted.slice((delSafePage - 1) * PAGE_SIZE, delSafePage * PAGE_SIZE)

  const batches = useMemo(() => {
    const map = new Map<string, BatchGroup>()
    for (const r of completed) {
      const bid = r.batchId || 'unknown'
      if (!map.has(bid)) map.set(bid, { batchId: bid, records: [], startTime: r.completedAt, endTime: r.completedAt, totalCount: 0, successCount: 0, failCount: 0 })
      const g = map.get(bid)!
      g.records.push(r); g.startTime = Math.min(g.startTime, r.completedAt); g.endTime = Math.max(g.endTime, r.completedAt); g.totalCount++
      if (r.status === '失败') g.failCount++; else g.successCount++
    }
    return [...map.values()].sort((a, b) => b.startTime - a.startTime)
  }, [completed])

  const handleOpenFolder = (fp: string) => { if (fp) window.api.openFileLocation(fp) }
  const handleCopyLink = (url: string) => { navigator.clipboard.writeText(url) }
  const handleToggleItem = useCallback((id: string) => setSelectedIds((prev) => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n }), [])
  const handleSelectPage = useCallback(() => setSelectedIds(allOnPage ? new Set() : new Set(paginatedCompleted.map((r) => r.id))), [allOnPage, paginatedCompleted])
  const handleSelectAll = useCallback(() => setSelectedIds(filteredCompleted.length > 0 && filteredCompleted.every((r) => selectedIds.has(r.id)) ? new Set() : new Set(filteredCompleted.map((r) => r.id))), [filteredCompleted, selectedIds])
  const switchTab = useCallback((t: TabType) => { setTab(t); setSelectedIds(new Set()); setSearchQuery(''); setCurrentPage(1) }, [])

  const handleDeleteSelected = useCallback(async () => { await removeBatch([...selectedIds]); setSelectedIds(new Set()) }, [selectedIds, removeBatch])
  const handleDeleteSelectedWithFile = useCallback(async () => {
    const allExist = await removeBatchWithFile([...selectedIds])
    setSelectedIds(new Set())
    if (!allExist) alert(t.library.someFilesMissing)
  }, [selectedIds, removeBatchWithFile, t])

  const handleRemoveOne = useCallback(async (id: string) => { await remove(id) }, [remove])
  const handleRemoveOneWithFile = useCallback(async (id: string) => {
    const allExist = await removeWithFile(id)
    if (!allExist) alert(t.library.fileNotFound)
  }, [removeWithFile, t])

  const handleDeleteBatch = useCallback(async (batch: BatchGroup) => { await removeBatch(batch.records.map((r) => r.id)) }, [removeBatch])
  const handleDeleteBatchWithFile = useCallback(async (batch: BatchGroup) => {
    const allExist = await removeBatchWithFile(batch.records.map((r) => r.id))
    if (!allExist) alert(t.library.someFilesMissing)
  }, [removeBatchWithFile, t])

  const toggleBatchExpand = useCallback((bid: string) => setExpandedBatches((prev) => { const n = new Set(prev); n.has(bid) ? n.delete(bid) : n.add(bid); return n }), [])
  const handleExportBatch = useCallback(async (batch: BatchGroup) => { await window.api.exportBatchCsv(batch) }, [])
  const handleRestoreOne = useCallback(async (id: string) => { await restoreDeleted(id) }, [restoreDeleted])

  const goToPage = useCallback((p: number) => setCurrentPage(Math.max(1, Math.min(p, totalPages))), [totalPages])
  useEffect(() => { setCurrentPage(1) }, [filteredCompleted.length])

  const fmtTime = (ts: number) => { const d = new Date(ts); return `${d.getMonth() + 1}/${d.getDate()} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}` }

  const someSelected = selectedIds.size > 0

  return (
    <div className="flex flex-col gap-4">
      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-neutral-200/60 dark:border-neutral-800/60">
        {(['completed', 'batches', 'incomplete', 'deleted'] as TabType[]).map((tb) => (
          <button key={tb} className={cn('px-4 py-2 text-[13px] font-medium border-b-2 transition-colors -mb-[1px]', tab === tb ? 'border-[#007AFF] text-[#007AFF]' : 'border-transparent text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300')} onClick={() => switchTab(tb)}>
            {tb === 'completed' ? t.library.completed : tb === 'batches' ? t.library.batches : tb === 'incomplete' ? t.library.incomplete : t.library.deleted}
            {tb === 'deleted' && deleted.length > 0 && <span className="ml-1 text-[11px] text-neutral-400">({deleted.length})</span>}
          </button>
        ))}
        {tab === 'completed' && filteredCompleted.length > 0 && (
          <div className="ml-auto flex items-center gap-1">
            <button className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" onClick={handleSelectPage}>{allOnPage ? t.library.deselectPage : t.library.selectPage}</button>
            <button className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300" onClick={handleSelectAll}>{t.library.selectAll}</button>
            {someSelected && (
              <>
                <Button variant="ghost" size="sm" className="text-xs text-[#FF3B30] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10" onClick={handleDeleteSelected}>
                  <Trash2 className="w-3.5 h-3.5 mr-1" />{t.library.deleteSelected.replace('{count}', String(selectedIds.size))}
                </Button>
                <Button variant="ghost" size="sm" className="text-xs text-[#FF3B30] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10" onClick={handleDeleteSelectedWithFile}>
                  <FileX className="w-3.5 h-3.5 mr-1" />{t.library.deleteSelectedAndFile.replace('{count}', String(selectedIds.size))}
                </Button>
              </>
            )}
          </div>
        )}
      </div>

      {/* Completed tab */}
      {tab === 'completed' && (
        <div className="flex flex-col gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-neutral-400" />
            <input type="text" className="w-full h-8 rounded-mac border border-neutral-200 bg-white/80 pl-8 pr-3 text-[13px] placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-[#007AFF] dark:border-neutral-700 dark:bg-neutral-800" placeholder={t.library.search} value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
          </div>
          {filteredCompleted.length === 0 ? (
            <div className="text-center py-16 text-[13px] text-neutral-300 dark:text-neutral-600">{searchQuery ? t.library.noSearchResults : t.library.noCompleted}</div>
          ) : (
            <>
              {paginatedCompleted.map((r) => (
                <Card key={r.id}>
                  <CardContent className="flex items-center gap-3 py-3">
                    <input type="checkbox" checked={selectedIds.has(r.id)} onChange={() => handleToggleItem(r.id)} className="w-4 h-4 rounded border-neutral-300 text-[#007AFF] focus:ring-[#007AFF] flex-shrink-0" />
                    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                      <span className="text-[13px] font-medium truncate">{r.title}</span>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        <span>{new Date(r.completedAt).toLocaleString()}</span>
                        {r.filePath && <span className="truncate max-w-[200px]">{r.filePath.split('/').pop()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleCopyLink(r.url)}><Copy className="w-3 h-3" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => handleOpenFolder(r.filePath)}><FolderOpen className="w-3.5 h-3.5 mr-1" />{t.library.openFolder}</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-neutral-400 hover:text-[#FF3B30]" onClick={() => handleRemoveOne(r.id)} title={t.library.deleteRecord}><Trash2 className="w-3.5 h-3.5" /></Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-neutral-400 hover:text-[#FF3B30]" onClick={() => handleRemoveOneWithFile(r.id)} title={t.library.deleteRecordAndFile}><FileX className="w-3.5 h-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-1 pt-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={safePage <= 1} onClick={() => goToPage(safePage - 1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <Button key={p} variant={p === safePage ? 'default' : 'ghost'} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => goToPage(p)}>{p}</Button>
                  ))}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={safePage >= totalPages} onClick={() => goToPage(safePage + 1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
                  <span className="text-[11px] text-neutral-400 ml-2">{filteredCompleted.length} 条 · {totalPages} 页</span>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Batches tab */}
      {tab === 'batches' && (
        <div className="flex flex-col gap-2">
          {batches.length === 0 ? (
            <div className="text-center py-16 text-[13px] text-neutral-300 dark:text-neutral-600">{t.library.noBatches}</div>
          ) : batches.map((batch) => {
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
                    <Button variant="ghost" size="sm" className="h-7 text-xs flex-shrink-0 text-neutral-400 hover:text-[#FF3B30]" onClick={(e) => { e.stopPropagation(); handleDeleteBatchWithFile(batch) }}><FileX className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs flex-shrink-0 text-neutral-400 hover:text-[#FF3B30]" onClick={(e) => { e.stopPropagation(); handleDeleteBatch(batch) }}><Trash2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="sm" className="h-7 text-xs flex-shrink-0" onClick={(e) => { e.stopPropagation(); handleExportBatch(batch) }}><Download className="w-3.5 h-3.5 mr-1" />{t.library.exportCsv}</Button>
                  </button>
                  {expanded && (
                    <div className="border-t border-neutral-200/40 dark:border-neutral-800/40 px-4 py-2">
                      {batch.records.map((r, i) => (
                        <div key={r.id} className="flex items-center gap-3 py-2 border-b border-neutral-100 dark:border-neutral-800 last:border-0">
                          <span className="text-[11px] text-neutral-400 w-6 flex-shrink-0">{i + 1}</span>
                          <div className="flex flex-col flex-1 min-w-0 gap-0.5"><span className="text-[12px] truncate">{r.title}</span><span className="text-[10px] text-neutral-400 truncate">{r.url}</span></div>
                          <Badge variant={r.status === '失败' ? 'destructive' : 'default'} className="flex-shrink-0">{r.status || '成功'}</Badge>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {/* Incomplete tab */}
      {tab === 'incomplete' && (
        <div className="flex flex-col gap-2 pb-4">
          {incompleteTasks.length === 0 ? (
            <div className="text-center py-16 text-[13px] text-neutral-300 dark:text-neutral-600">{t.library.noIncomplete}</div>
          ) : incompleteTasks.map((task) => (
            <Card key={task.id}>
              <CardContent className="flex items-center gap-3 py-3">
                <div className="flex flex-col flex-1 min-w-0 gap-0.5"><span className="text-[13px] font-medium truncate">{task.title || task.url}</span><span className="text-[11px] text-neutral-400">{task.status === 'failed' ? task.error : task.status}</span></div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Deleted tab */}
      {tab === 'deleted' && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <span className="text-[12px] text-neutral-400">{deleted.length} 条已删除记录</span>
            {deleted.length > 0 && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="text-xs text-neutral-400 hover:text-[#007AFF]" onClick={restoreAllDeleted}><Undo2 className="w-3.5 h-3.5 mr-1" />{t.library.restoreAll}</Button>
                <Button variant="ghost" size="sm" className="text-xs text-neutral-400 hover:text-[#FF3B30]" onClick={clearDeleted}><Trash2 className="w-3.5 h-3.5 mr-1" />{t.library.clearDeleted}</Button>
              </div>
            )}
          </div>
          {deleted.length === 0 ? (
            <div className="text-center py-16 text-[13px] text-neutral-300 dark:text-neutral-600">{t.library.noDeleted}</div>
          ) : (
            <>
              {paginatedDeleted.map((r) => (
                <Card key={r.id} className="opacity-70">
                  <CardContent className="flex items-center gap-3 py-3">
                    <div className="flex flex-col flex-1 min-w-0 gap-0.5">
                      <span className="text-[13px] font-medium truncate">{r.title}</span>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400">
                        <span>{new Date(r.deletedAt || r.completedAt).toLocaleString()}</span>
                        {r.filePath && <span className="truncate max-w-[200px]">{r.filePath.split('/').pop()}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-[#007AFF] hover:text-[#007AFF]" onClick={() => handleRestoreOne(r.id)}><Undo2 className="w-3.5 h-3.5 mr-1" />{t.library.restore}</Button>
                      <Button variant="ghost" size="sm" className="h-7 text-xs text-neutral-400 hover:text-[#FF3B30]" onClick={() => permanentDeleteDeleted(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {delTotalPages > 1 && (
                <div className="flex items-center justify-center gap-1 pt-2">
                  <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={delSafePage <= 1} onClick={() => setDelCurrentPage(delSafePage - 1)}><ChevronLeft className="w-3.5 h-3.5" /></Button>
                  {Array.from({ length: delTotalPages }, (_, i) => i + 1).map((p) => (
                    <Button key={p} variant={p === delSafePage ? 'default' : 'ghost'} size="sm" className="h-7 w-7 text-xs p-0" onClick={() => setDelCurrentPage(p)}>{p}</Button>
                  ))}
                  <Button variant="ghost" size="sm" className="h-7 text-xs" disabled={delSafePage >= delTotalPages} onClick={() => setDelCurrentPage(delSafePage + 1)}><ChevronRight className="w-3.5 h-3.5" /></Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
