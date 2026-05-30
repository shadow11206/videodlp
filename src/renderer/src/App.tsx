import { useState, useEffect } from 'react'
import { Titlebar } from '@/components/titlebar'
import { Sidebar, type NavPage } from '@/components/sidebar'
import { BottomBar } from '@/components/bottom-bar'
import { DownloadPanel } from '@/components/download-panel'
import { Downloader } from '@/pages/downloader'
import { Downloading } from '@/pages/downloading'
import { Library } from '@/pages/library'
import { Settings } from '@/pages/settings'
import { useDownload } from '@/stores/download'
import { useHistory } from '@/stores/history'
import type { DownloadTask } from '@shared/types'

export default function App() {
  const [page, setPage] = useState<NavPage>('downloader')
  const [ytDlpReady, setYtDlpReady] = useState(false)

  useEffect(() => {
    window.api.checkYtDlp().then((status) => {
      setYtDlpReady(status.installed)
    }).catch(() => {})
  }, [])

  useEffect(() => {
    const cleanup = window.api.onDownloadProgress((task: DownloadTask) => {
      useDownload.getState().updateTask(task)
      if (task.status === 'completed') {
        useHistory.getState().add({
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
    return cleanup
  }, [])

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f7] dark:bg-[#1c1c1e] text-neutral-900 dark:text-neutral-100">
      <Titlebar />

      <div className="flex-1 relative">
        <Sidebar active={page} onNavigate={setPage} />

        <main className="absolute top-[38px] left-[220px] right-0 bottom-[28px] overflow-y-auto p-6">
          {page === 'downloader' && <Downloader />}
          {page === 'downloading' && <Downloading />}
          {page === 'library' && <Library />}
          {page === 'settings' && <Settings />}
        </main>
      </div>

      <DownloadPanel />
      <BottomBar ytDlpReady={ytDlpReady} />
    </div>
  )
}
