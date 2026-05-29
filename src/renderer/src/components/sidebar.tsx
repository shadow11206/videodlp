import { Download, Library, Settings } from 'lucide-react'
import { useI18n } from '@/stores/i18n'
import { cn } from '@/lib/utils'

export type NavPage = 'downloader' | 'library' | 'settings'

interface SidebarProps {
  active: NavPage
  onNavigate: (page: NavPage) => void
}

const items: { id: NavPage; icon: typeof Download; labelKey: 'downloader' | 'library' | 'settings' }[] = [
  { id: 'downloader', icon: Download, labelKey: 'downloader' },
  { id: 'library', icon: Library, labelKey: 'library' },
  { id: 'settings', icon: Settings, labelKey: 'settings' }
]

export function Sidebar({ active, onNavigate }: SidebarProps) {
  const { t } = useI18n()

  return (
    <div
      className="fixed top-0 left-0 bottom-0 w-[220px] z-40 pt-[38px]"
      style={{ WebkitAppRegion: 'no-drag' as any }}
    >
      <div className="h-full backdrop-blur-xl bg-white/70 dark:bg-neutral-900/70 border-r border-neutral-200/40 dark:border-neutral-800/40 px-3 py-4 flex flex-col gap-1">
        {items.map(({ id, icon: Icon, labelKey }) => (
          <button
            key={id}
            onClick={() => onNavigate(id)}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-mac text-sm font-medium transition-colors w-full text-left',
              active === id
                ? 'bg-[#007AFF]/10 text-[#007AFF]'
                : 'text-neutral-600 hover:bg-neutral-200/50 dark:text-neutral-400 dark:hover:bg-neutral-800/50'
            )}
          >
            <Icon className="w-[18px] h-[18px]" />
            {t.nav[labelKey]}
          </button>
        ))}
      </div>
    </div>
  )
}
