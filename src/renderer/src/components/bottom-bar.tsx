import { useI18n } from '@/stores/i18n'
import { useDownload } from '@/stores/download'

interface BottomBarProps {
  ytDlpReady: boolean
}

export function BottomBar({ ytDlpReady }: BottomBarProps) {
  const { t } = useI18n()
  const tasks = useDownload((s) => s.tasks)
  const activeCount = tasks.filter((t) => t.status === 'downloading' || t.status === 'pending').length
  const queuedCount = tasks.filter((t) => t.status === 'pending').length

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 h-[28px] flex items-center px-4"
      style={{ WebkitAppRegion: 'no-drag' as any }}
    >
      <div className="flex items-center gap-3 text-[11px] text-neutral-500 dark:text-neutral-500 w-full">
        <div className="flex items-center gap-1.5">
          <span
            className={`inline-block w-1.5 h-1.5 rounded-full ${ytDlpReady ? 'bg-[#34C759]' : 'bg-[#FF3B30]'}`}
          />
          <span>
            {ytDlpReady ? t.bottomBar.ready : t.bottomBar.notInstalled}
          </span>
        </div>
        {activeCount > 0 && (
          <>
            <span className="text-neutral-300 dark:text-neutral-700">|</span>
            <span>
              {t.bottomBar.downloading}: {activeCount}
            </span>
            {queuedCount > 0 && (
              <span>
                {t.bottomBar.queued}: {queuedCount}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  )
}
