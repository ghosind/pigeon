/**
 * System config repository — CRUD for the single-row system_config table.
 *
 * Always operates on row id=1.
 */

import { get, run } from '../sqlite'
import { ThemeMode, type SystemConfig } from '@shared/types'

function rowToConfig(row: Record<string, unknown>): SystemConfig {
  return {
    id: row.id as number,
    theme: (row.theme as ThemeMode) || ThemeMode.System,
    timeout: (row.timeout as number) || 30000,
    ignoreSSL: Boolean(row.ignore_ssl),
    enableProxy: Boolean(row.enable_proxy),
    proxyUrl: (row.proxy_url as string) || '',
    historyRetention: (row.history_retention as number) || 30,
    layoutSplitPercent: (row.layout_split_percent as number) ?? 50,
    createTime: row.create_time as string,
    updateTime: row.update_time as string
  }
}

/** Fetch the current system configuration. Returns default if no row exists. */
export function getConfig(): SystemConfig {
  const row = get(`SELECT * FROM system_config WHERE id = 1`) as Record<string, unknown> | undefined

  if (!row) {
    // Should not happen (ensured by schema init), but provide safe default
    const now = new Date().toISOString()
    return {
      id: 1,
      theme: ThemeMode.System,
      timeout: 30000,
      ignoreSSL: false,
      enableProxy: false,
      proxyUrl: '',
      historyRetention: 30,
      layoutSplitPercent: 50,
      createTime: now,
      updateTime: now
    }
  }

  return rowToConfig(row)
}

/** Save (upsert) the system configuration. */
export function saveConfig(config: Partial<SystemConfig>): SystemConfig {
  const existing = getConfig()

  const merged: SystemConfig = { ...existing, ...config, id: 1 }

  run(
    `UPDATE system_config SET
      theme = ?, timeout = ?, ignore_ssl = ?, enable_proxy = ?,
      proxy_url = ?, history_retention = ?, layout_split_percent = ?,
      update_time = datetime('now')
     WHERE id = 1`,
    [
      merged.theme || ThemeMode.System,
      merged.timeout || 30000,
      merged.ignoreSSL ? 1 : 0,
      merged.enableProxy ? 1 : 0,
      merged.proxyUrl || '',
      merged.historyRetention || 30,
      merged.layoutSplitPercent ?? 50
    ]
  )

  return merged
}
