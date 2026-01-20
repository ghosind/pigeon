import React, { useEffect, useMemo, useState } from 'react'
import { I18nContext, I18nContextValue, Lang } from './useI18n'

const STORAGE_KEY = 'pigeon:lang'

const translations: Record<Lang, Record<string, string>> = {
  en: {},
  zh: {}
}

export const I18nProvider: React.FC<React.PropsWithChildren<Record<string, unknown>>> = ({
  children
}) => {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const v = (localStorage.getItem(STORAGE_KEY) as Lang) || undefined
      if (v) return v
    } catch (e) {
      void e
    }
    if (typeof navigator !== 'undefined' && navigator.language?.startsWith('zh')) return 'zh'
    return 'en'
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch (e) {
      void e
    }
  }, [lang])

  const t = useMemo(() => (key: string) => translations[lang][key] || key, [lang])

  const value: I18nContextValue = { lang, t, setLang }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export default I18nProvider
