/**
 * appSettingStore — manages application settings (language, timeout, SSL, shortcuts, etc.)
 */

import { create } from 'zustand'
import type { SystemConfig, Language } from '@shared/types'
import { ThemeMode } from '@shared/types'

const defaults: SystemConfig = {
  id: 1,
  theme: ThemeMode.System,
  language: 'en',
  fontSize: 13,
  timeout: 30000,
  ignoreSSL: false,
  enableProxy: false,
  proxyUrl: '',
  historyRetention: 30,
  layoutSplitPercent: 50,
  saveResponseInHistory: true,
  shortcuts: {
    sendRequest: 'Ctrl+Enter',
    toggleLeftSidebar: 'Ctrl+B',
    toggleRightSidebar: 'Ctrl+Shift+C',
    createRequest: 'Ctrl+T',
    closeRequest: 'Ctrl+W'
  },
  createTime: new Date().toISOString(),
  updateTime: new Date().toISOString()
}

export interface AppSettingState {
  config: SystemConfig
  hydrated: boolean
  hydrate: () => Promise<void>
  updateConfig: (partial: Partial<SystemConfig>) => void
  saveConfig: () => Promise<void>
  setLanguage: (lang: Language) => void
}

export const useAppSettingStore = create<AppSettingState>((set, get) => ({
  config: { ...defaults },
  hydrated: false,

  hydrate: async () => {
    try {
      const res = await window.api?.getConfig()
      if (res?.ok && res.data) {
        set({ config: { ...defaults, ...res.data }, hydrated: true })
      }
    } catch {
      set({ hydrated: true })
    }
  },

  updateConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),

  saveConfig: async () => {
    try {
      await window.api?.saveConfig(get().config)
    } catch {
      // silently handled
    }
  },

  setLanguage: (lang) => {
    try {
      localStorage.setItem('pigeon:lang', lang)
    } catch {
      // silently handled
    }
    set((s) => ({ config: { ...s.config, language: lang } }))
  }
}))
