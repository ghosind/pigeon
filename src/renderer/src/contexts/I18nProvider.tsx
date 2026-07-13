import React, { useEffect, useMemo, useState } from 'react'
import { I18nContext, type I18nContextValue, type Lang } from './useI18n'

import en from '../i18n/en.json'
import zh from '../i18n/zh.json'

const STORAGE_KEY = 'pigeon:lang'

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
    } catch (err) {
      console.error('Failed to get language from localStorage:', err)
    }
    if (typeof navigator !== 'undefined' && navigator.language?.startsWith('zh')) return 'zh'
    return 'en'
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, lang)
    } catch (err) {
      console.error('Failed to set language to localStorage:', err)
    }
    // persist to sqlite via preload API
    try {
      if (typeof window !== 'undefined' && window.api?.saveSettings) {
        window.api.saveSettings({ language: lang })
      }
    } catch (err) {
      console.error('Failed to save language to sqlite:', err)
    }
  }, [lang])

  // on mount, try load from sqlite and apply
  useEffect(() => {
    async function load(): Promise<void> {
      try {
        if (typeof window !== 'undefined' && window.api?.loadSettings) {
          const res = await window.api.loadSettings()
          if (res?.ok && res.result && res.result.language) {
            setLang(res.result.language as Lang)
          }
        }
      } catch (err) {
        console.error('Failed to load language from sqlite:', err)
      }
    }
    load()
  }, [])

  const t = useMemo(
    () =>
      (key: string, params?: Record<string, string | number>): string => {
        let value: string = translations[lang][key] || key
        if (params) {
          for (const [k, v] of Object.entries(params)) {
            value = value.replace(`{${k}}`, String(v))
          }
        }
        return value
      },
    [lang]
  )

  const value: I18nContextValue = { lang, t, setLang }

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export default I18nProvider
