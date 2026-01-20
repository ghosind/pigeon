import React, { useEffect, useMemo, useState } from 'react'
import { I18nContext } from './useI18n'

export type Lang = 'en' | 'zh'

const STORAGE_KEY = 'pigeon:lang'

import en from '../i18n/en'
import zh from '../i18n/zh'

const translations: Record<Lang, Record<string, string>> = {
  en,
  zh
}

export const I18nProvider: React.FC<React.PropsWithChildren<Record<string, unknown>>> = ({
  children
}) => {
  const [lang, setLang] = useState<Lang>(() => {
    try {
      const v = (localStorage.getItem(STORAGE_KEY) as Lang) || undefined
      if (v) return v
    } catch {
      // ignore localStorage errors
    }
    if (typeof navigator !== 'undefined' && navigator.language?.startsWith('zh')) return 'zh'
    return 'en'
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch {
      // ignore localStorage errors
    }
  }, [lang])

  const t = useMemo(() => (key: string) => translations[lang][key] || key, [lang])

  return <I18nContext.Provider value={{ lang, t, setLang }}>{children}</I18nContext.Provider>
}

export default I18nProvider
