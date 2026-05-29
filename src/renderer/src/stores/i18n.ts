import { create } from 'zustand'
import zhCN, { type Locale } from '@/locales/zh-CN'
import enUS from '@/locales/en-US'

const locales: Record<string, Locale> = {
  'zh-CN': zhCN,
  'en-US': enUS
}

interface I18nState {
  locale: string
  t: Locale
  setLocale: (lang: string) => void
}

export const useI18n = create<I18nState>((set) => ({
  locale: 'zh-CN',
  t: zhCN,
  setLocale: (lang: string) => set({ locale: lang, t: locales[lang] || zhCN })
}))
