import { useState, useEffect } from 'react'
import { Titlebar } from '@/components/titlebar'
import { Sidebar, type NavPage } from '@/components/sidebar'
import { BottomBar } from '@/components/bottom-bar'
import { Downloader } from '@/pages/downloader'
import { Library } from '@/pages/library'
import { Settings } from '@/pages/settings'

export default function App() {
  const [page, setPage] = useState<NavPage>('downloader')
  const [ytDlpReady, setYtDlpReady] = useState(false)

  useEffect(() => {
    window.api.checkYtDlp().then((status) => {
      setYtDlpReady(status.installed)
    }).catch(() => {})
  }, [])

  return (
    <div className="h-screen flex flex-col bg-[#f5f5f7] dark:bg-[#1c1c1e] text-neutral-900 dark:text-neutral-100">
      <Titlebar />

      <div className="flex flex-1 pt-[38px] pb-[28px]">
        <Sidebar active={page} onNavigate={setPage} />

        <main className="ml-[220px] flex-1 p-6 overflow-hidden">
          <div className="h-full">
            {page === 'downloader' && <Downloader />}
            {page === 'library' && <Library />}
            {page === 'settings' && <Settings />}
          </div>
        </main>
      </div>

      <BottomBar ytDlpReady={ytDlpReady} />
    </div>
  )
}
