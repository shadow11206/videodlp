import { useI18n } from '@/stores/i18n'

export function Titlebar() {
  const { t } = useI18n()

  return (
    <div
      className="fixed top-0 left-0 right-0 z-50"
      style={{ height: '38px', WebkitAppRegion: 'drag' as any }}
    >
      <div className="flex items-center justify-center h-full">
        <span className="text-[13px] font-semibold text-neutral-800 dark:text-neutral-200">
          {t.app.title}
        </span>
      </div>
    </div>
  )
}
