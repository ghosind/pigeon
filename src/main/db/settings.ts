import { run, all, exec } from './sqlite'

interface SettingRow {
  key: string
  value: string
}

export async function initSettingsTable(): Promise<void> {
  const sql = `CREATE TABLE IF NOT EXISTS settings (
key TEXT PRIMARY KEY, value TEXT
);`
  exec(sql)
}

export async function saveSettings(settings: Record<string, string>): Promise<void> {
  if (!settings || typeof settings !== 'object') {
    return
  }
  const keys = Object.keys(settings)
  if (keys.length === 0) {
    return
  }

  const sql = `INSERT OR REPLACE INTO settings(key, value) VALUES(?, ?)`
  for (const k of keys) {
    const v = settings[k]
    run(sql, [k, v])
  }
}

export async function loadAllSettings(): Promise<Record<string, string>> {
  const rows = all<SettingRow>(`SELECT key, value FROM settings`)
  const result: Record<string, string> = {}
  for (const r of rows) {
    try {
      result[r.key] = r.value
    } catch (e) {
      console.error(`Failed to parse setting value for key ${r.key}:`, e)
      result[r.key] = r.value
    }
  }
  return result
}

export async function getSetting(key: string): Promise<string | null> {
  const row = all<SettingRow>(`SELECT value FROM settings WHERE key = ?`, [key])
  if (!row || row.length === 0) {
    return null
  }
  return row[0].value
}

export async function ensureSettings(): Promise<void> {
  await initSettingsTable()
}
