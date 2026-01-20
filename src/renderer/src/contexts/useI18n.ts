import { createContext, useContext } from 'react'

export type Lang = 'en' | 'zh'

export type I18nContextValue = {
  lang: Lang
  t: (key: string) => string
  setLang: (l: Lang) => void
}

export const I18nContext = createContext<I18nContextValue | undefined>(undefined)

export const useI18n = (): I18nContextValue => {
  const ctx = useContext(I18nContext)
  if (!ctx) throw new Error('useI18n must be used within I18nProvider')
  return ctx
}

export default useI18n
