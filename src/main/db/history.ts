import { all, exec, run } from './sqlite'
import { RequestHistory } from '@shared/types'

type HistoryRecordRow = {
  history_id: string
  request_id: string
  request_type: string
  method: string | null
  url: string | null
  status_code: number | null
  has_response: number
  timestamp: number
  request_payload: string
  response_payload: string | null
}

type LegacyHistoryRow = {
  value: string
}

type TableInfoRow = {
  name: string
}

function createHistoryTable(): void {
  exec(`CREATE TABLE IF NOT EXISTS history (
history_id TEXT PRIMARY KEY,
request_id TEXT NOT NULL,
request_type TEXT NOT NULL,
method TEXT,
url TEXT,
status_code INTEGER,
has_response INTEGER NOT NULL DEFAULT 0,
timestamp INTEGER NOT NULL,
request_payload TEXT NOT NULL,
response_payload TEXT,
updated_at INTEGER NOT NULL
);`)

  exec(`CREATE INDEX IF NOT EXISTS idx_history_timestamp ON history(timestamp DESC);`)
  exec(`CREATE INDEX IF NOT EXISTS idx_history_request_id ON history(request_id);`)
  exec(`CREATE INDEX IF NOT EXISTS idx_history_method ON history(method);`)
  exec(`CREATE INDEX IF NOT EXISTS idx_history_url ON history(url);`)
  exec(`CREATE INDEX IF NOT EXISTS idx_history_type ON history(request_type);`)
}

function parseLegacyHistory(raw: string): RequestHistory[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as RequestHistory[]) : []
  } catch (err) {
    console.error('Failed to parse legacy history data from sqlite:', err)
    return []
  }
}

async function migrateLegacyHistoryIfNeeded(): Promise<void> {
  const tableInfo = all<TableInfoRow>(`PRAGMA table_info(history)`)
  if (!tableInfo.length) {
    createHistoryTable()
    return
  }

  const columns = new Set(tableInfo.map((x) => x.name))
  if (columns.has('history_id') && columns.has('request_payload') && columns.has('timestamp')) {
    createHistoryTable()
    return
  }

  if (columns.has('id') && columns.has('value')) {
    const rows = all<LegacyHistoryRow>(`SELECT value FROM history WHERE id = 1 LIMIT 1`)
    const legacy = rows.length ? parseLegacyHistory(rows[0].value) : []

    exec(`DROP TABLE IF EXISTS history`)
    createHistoryTable()
    await saveHistory(legacy)
    return
  }

  // Unknown schema: recreate as latest shape.
  exec(`DROP TABLE IF EXISTS history`)
  createHistoryTable()
}

export async function initHistoryTable(): Promise<void> {
  await migrateLegacyHistoryIfNeeded()
}

export async function saveHistory(list: RequestHistory[]): Promise<void> {
  const now = Date.now()
  exec('BEGIN TRANSACTION')
  try {
    run(`DELETE FROM history`)

    const sql = `INSERT INTO history(
history_id, request_id, request_type, method, url, status_code, has_response, timestamp, request_payload, response_payload, updated_at
) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

    for (const item of list) {
      run(sql, [
        item.id,
        item.requestId,
        item.type,
        item.request?.method ?? null,
        item.request?.url ?? null,
        typeof item.response?.status === 'number' ? item.response.status : null,
        item.response ? 1 : 0,
        item.timestamp,
        JSON.stringify(item.request),
        item.response ? JSON.stringify(item.response) : null,
        now
      ])
    }

    exec('COMMIT')
  } catch (err) {
    exec('ROLLBACK')
    throw err
  }
}

export async function loadHistory(): Promise<RequestHistory[]> {
  const rows =
    all<HistoryRecordRow>(`SELECT history_id, request_id, request_type, method, url, status_code, has_response, timestamp, request_payload, response_payload
FROM history
ORDER BY timestamp DESC`)

  if (!rows.length) {
    return []
  }

  const result: RequestHistory[] = []
  for (const row of rows) {
    try {
      const request = JSON.parse(row.request_payload)
      const response =
        row.has_response && row.response_payload ? JSON.parse(row.response_payload) : undefined

      result.push({
        id: row.history_id,
        requestId: row.request_id,
        type: row.request_type as RequestHistory['type'],
        timestamp: row.timestamp,
        request,
        response
      })
    } catch (err) {
      console.error(`Failed to parse history payload for item ${row.history_id}:`, err)
    }
  }

  return result
}

export async function searchHistory(keyword: string, limit = 200): Promise<RequestHistory[]> {
  const q = (keyword || '').trim().toLowerCase()
  if (!q) {
    return loadHistory()
  }

  const normalizedLimit = Number.isFinite(limit)
    ? Math.max(1, Math.min(1000, Math.floor(limit)))
    : 200

  const likeExpr = `%${q}%`
  const rows = all<HistoryRecordRow>(
    `SELECT history_id, request_id, request_type, method, url, status_code, has_response, timestamp, request_payload, response_payload
FROM history
WHERE lower(coalesce(url, '')) LIKE ?
   OR lower(coalesce(method, '')) LIKE ?
   OR lower(coalesce(request_id, '')) LIKE ?
ORDER BY timestamp DESC
LIMIT ?`,
    [likeExpr, likeExpr, likeExpr, normalizedLimit]
  )

  if (!rows.length) {
    return []
  }

  const result: RequestHistory[] = []
  for (const row of rows) {
    try {
      const request = JSON.parse(row.request_payload)
      const response =
        row.has_response && row.response_payload ? JSON.parse(row.response_payload) : undefined

      result.push({
        id: row.history_id,
        requestId: row.request_id,
        type: row.request_type as RequestHistory['type'],
        timestamp: row.timestamp,
        request,
        response
      })
    } catch (err) {
      console.error(`Failed to parse history payload for item ${row.history_id}:`, err)
    }
  }

  return result
}

export async function ensureHistoryStore(): Promise<void> {
  await initHistoryTable()
}
