import { useState, useEffect } from 'react'
import { Folder, RefreshCw, Check, Loader2, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { useI18n } from '@/stores/i18n'
import { useSettings } from '@/stores/settings'

export function Settings() {
  const { t, locale, setLocale } = useI18n()
  const settings = useSettings()

  const [ytDlpStatus, setYtDlpStatus] = useState({ installed: false, version: '' })
  const [updating, setUpdating] = useState(false)
  const [aria2cStatus, setAria2cStatus] = useState({ installed: false, version: '' })

  useEffect(() => {
    settings.load()
    checkYtDlp()
    window.api.checkAria2c().then(setAria2cStatus)
  }, [])

  useEffect(() => {
    if (settings.loaded && settings.language) {
      setLocale(settings.language)
    }
  }, [settings.loaded, settings.language])

  const checkYtDlp = async () => {
    try {
      const status = await window.api.checkYtDlp()
      setYtDlpStatus(status)
    } catch { /* ignore */ }
  }

  const handleUpdateYtDlp = async () => {
    setUpdating(true)
    try {
      await window.api.updateYtDlp()
      await checkYtDlp()
    } catch { /* ignore */ }
    setUpdating(false)
  }

  const handleSelectPath = async () => {
    const path = await window.api.selectDirectory()
    if (path) settings.setDownloadPath(path)
  }

  const handleLanguageChange = async (lang: string) => {
    setLocale(lang)
    await settings.update({ language: lang as 'zh-CN' | 'en-US' })
  }

  const handleThemeChange = async (theme: string) => {
    await settings.update({ theme: theme as 'system' | 'light' | 'dark' })
    applyTheme(theme)
  }

  const applyTheme = (theme: string) => {
    const root = document.documentElement
    if (theme === 'dark') {
      root.classList.add('dark')
    } else if (theme === 'light') {
      root.classList.remove('dark')
    } else {
      root.classList.toggle('dark', window.matchMedia('(prefers-color-scheme: dark)').matches)
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-[560px]">
      <h1 className="text-[17px] font-semibold">{t.settings.title}</h1>

      <div className="flex flex-col gap-3">
        {/* Download Path */}
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium">{t.settings.downloadPath}</span>
              <span className="text-[12px] text-neutral-400 truncate max-w-[300px]">
                {settings.downloadPath || t.settings.notSet}
              </span>
            </div>
            <Button variant="outline" size="sm" onClick={handleSelectPath}>
              <Folder className="w-4 h-4 mr-1.5" />
              {t.settings.selectPath}
            </Button>
          </CardContent>
        </Card>

        {/* Max Concurrency */}
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <span className="text-[13px] font-medium">{t.settings.maxConcurrency}</span>
            <select
              className="h-8 rounded-mac border border-neutral-200 bg-white/80 px-2 text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF] dark:border-neutral-700 dark:bg-neutral-800"
              value={settings.maxConcurrency}
              onChange={(e) => settings.update({ maxConcurrency: parseInt(e.target.value) })}
            >
              {[1, 2, 3, 5, 8, 10].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Language */}
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <span className="text-[13px] font-medium">{t.settings.language}</span>
            <select
              className="h-8 rounded-mac border border-neutral-200 bg-white/80 px-2 text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF] dark:border-neutral-700 dark:bg-neutral-800"
              value={locale}
              onChange={(e) => handleLanguageChange(e.target.value)}
            >
              <option value="zh-CN">中文</option>
              <option value="en-US">English</option>
            </select>
          </CardContent>
        </Card>

        {/* Theme */}
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <span className="text-[13px] font-medium">{t.settings.theme}</span>
            <select
              className="h-8 rounded-mac border border-neutral-200 bg-white/80 px-2 text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF] dark:border-neutral-700 dark:bg-neutral-800"
              value={settings.theme || 'system'}
              onChange={(e) => handleThemeChange(e.target.value)}
            >
              <option value="system">{t.settings.themeSystem}</option>
              <option value="light">{t.settings.themeLight}</option>
              <option value="dark">{t.settings.themeDark}</option>
            </select>
          </CardContent>
        </Card>

        {/* Default Quality */}
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <span className="text-[13px] font-medium">{t.settings.defaultQuality}</span>
            <select
              className="h-8 rounded-mac border border-neutral-200 bg-white/80 px-2 text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF] dark:border-neutral-700 dark:bg-neutral-800"
              value={settings.defaultQuality || ''}
              onChange={(e) => settings.update({ defaultQuality: e.target.value })}
            >
              <option value="">{t.downloader.notSet}</option>
              {['4320p', '2160p', '1440p', '1080p', '720p', '480p', '360p'].map((q) => (
                <option key={q} value={q}>{q}</option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Aria2c */}
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex flex-col gap-0.5">
              <div className="flex items-center gap-2">
                <span className="text-[13px] font-medium">{t.settings.useAria2c}</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    className="sr-only peer"
                    checked={settings.useAria2c && aria2cStatus.installed}
                    disabled={!aria2cStatus.installed}
                    onChange={(e) => settings.update({ useAria2c: e.target.checked })}
                  />
                  <div className="w-9 h-5 bg-neutral-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#007AFF] dark:bg-neutral-700" />
                </label>
              </div>
              <span className="text-[12px] text-neutral-400">
                {aria2cStatus.installed
                  ? `${t.settings.aria2cInstalled} (${aria2cStatus.version})`
                  : t.settings.aria2cNotInstalled}
              </span>
            </div>
          </CardContent>
        </Card>

        {/* yt-dlp Status */}
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-medium">{t.settings.ytdlpStatus}</span>
              <span className="text-[12px] text-neutral-400">
                {ytDlpStatus.installed
                  ? `${t.settings.ytdlpInstalled} (v${ytDlpStatus.version})`
                  : t.settings.ytdlpNotInstalled}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {ytDlpStatus.installed && (
                <Check className="w-4 h-4 text-[#34C759]" />
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleUpdateYtDlp}
                disabled={updating || !ytDlpStatus.installed}
              >
                {updating ? (
                  <Loader2 className="w-4 h-4 animate-spin mr-1.5" />
                ) : (
                  <RefreshCw className="w-4 h-4 mr-1.5" />
                )}
                {updating ? t.settings.updating : t.settings.checkUpdate}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Cookie Browser */}
        <Card>
          <CardContent className="flex items-center justify-between py-3">
            <div className="flex flex-col gap-0.5 flex-1 min-w-0 mr-4">
              <span className="text-[13px] font-medium">{t.settings.cookieBrowser}</span>
              <span className="text-[12px] text-neutral-400">{t.settings.cookieWarning}</span>
            </div>
            <select
              className="h-8 rounded-mac border border-neutral-200 bg-white/80 px-2 text-[13px] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[#007AFF] dark:border-neutral-700 dark:bg-neutral-800 flex-shrink-0"
              value={settings.cookieBrowser || ''}
              onChange={(e) => settings.update({ cookieBrowser: e.target.value })}
            >
              <option value="">{t.settings.cookieDisabled}</option>
              <option value="firefox">Firefox</option>
              <option value="chrome">Chrome ⚠️</option>
              <option value="safari">Safari</option>
              <option value="edge">Edge ⚠️</option>
            </select>
          </CardContent>
        </Card>

        {/* Author */}
        <Card>
          <CardContent className="flex items-center gap-3 py-3">
            <img
              src="https://github.com/shadow11206.png"
              alt=""
              className="w-10 h-10 rounded-full flex-shrink-0"
            />
            <div className="flex flex-col gap-0.5 flex-1 min-w-0">
              <span className="text-[13px] font-medium">shadow11206</span>
              <span className="text-[12px] text-neutral-400">{t.settings.author}</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.open('https://github.com/shadow11206', '_blank')}
            >
              <ExternalLink className="w-3.5 h-3.5 mr-1.5" />
              {t.settings.github}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
