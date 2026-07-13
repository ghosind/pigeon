// =========================================================================
// System config — single-row application settings
// =========================================================================

import type { ThemeMode } from './enums'

export type Language = 'en' | 'zh'

export interface SystemConfig {
  id: number
  theme: ThemeMode
  language: Language
  fontSize: number
  timeout: number
  ignoreSSL: boolean
  enableProxy: boolean
  proxyUrl: string
  historyRetention: number
  layoutSplitPercent?: number
  saveResponseInHistory: boolean
  activeEnvironmentId?: string
  activeProxyId?: string
  shortcuts?: ShortcutConfig
  createTime: string
  updateTime: string
}

export interface ShortcutConfig {
  sendRequest: string
  toggleLeftSidebar: string
  toggleRightSidebar: string
  createRequest: string
  closeRequest: string
}
