// =========================================================================
// System config, tab state, search result types
// =========================================================================

import type { ThemeMode } from './enums'

export interface SystemConfig {
  id: number
  theme: ThemeMode
  timeout: number
  ignoreSSL: boolean
  enableProxy: boolean
  proxyUrl: string
  historyRetention: number
  layoutSplitPercent?: number
  createTime: string
  updateTime: string
}
