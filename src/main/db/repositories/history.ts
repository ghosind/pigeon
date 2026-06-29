/**
 * History repository — CRUD for request_history table.
 */

import { v4 as uuidv4 } from 'uuid'
import { all, get, run } from '../sqlite'
import type { RequestHistoryRecord, HTTPMethod } from '@shared/types'

// ---------------------------------------------------------------------------
// Row mapping
// ---------------------------------------------------------------------------

function rowToHistory(row: Record<string, unknown>): RequestHistoryRecord {
  return {
    id: row.id as string,
    method: (row.method as HTTPMethod) || 'GET',
    url: row.url as string,
    statusCode: (row.status_code as number) ?? undefined,
    costTime: (row.cost_time as number) ?? undefined,
    requestSnapshot: (row.request_full as string) || '',
    responseSnapshot: (row.response_full as string) || undefined,
    deleted: Boolean(row.deleted),
    createTime: row.create_time as string
  }
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

/** List history records, newest first. */
export function listHistory(limit = 200, offset = 0): RequestHistoryRecord[] {
  return all<Record<string, unknown>>(
    `SELECT * FROM request_history WHERE deleted = 0
     ORDER BY create_time DESC LIMIT ? OFFSET ?`,
    [limit, offset]
  ).map(rowToHistory)
}

/** Save a new history record. */
export function saveHistory(record: {
  method: HTTPMethod
  url: string
  statusCode?: number
  costTime?: number
  requestSnapshot: string
  responseSnapshot?: string
}): RequestHistoryRecord {
  const id = uuidv4()
  const now = new Date().toISOString()

  run(
    `INSERT INTO request_history (id, method, url, status_code, cost_time, request_full, response_full, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      record.method,
      record.url,
      record.statusCode ?? null,
      record.costTime ?? null,
      record.requestSnapshot,
      record.responseSnapshot || null,
      now
    ]
  )

  return {
    id,
    method: record.method,
    url: record.url,
    statusCode: record.statusCode,
    costTime: record.costTime,
    requestSnapshot: record.requestSnapshot,
    responseSnapshot: record.responseSnapshot,
    deleted: false,
    createTime: now
  }
}

/** Soft-delete a single history record. */
export function deleteHistory(id: string): boolean {
  return run('UPDATE request_history SET deleted = 1 WHERE id = ?', [id]).changes > 0
}

/** Clear all history records (soft-delete). */
export function clearHistory(): number {
  return run('UPDATE request_history SET deleted = 1').changes
}

/** Search history records. */
export function searchHistory(keyword: string, limit = 200): RequestHistoryRecord[] {
  const like = `%${keyword.trim()}%`
  return all<Record<string, unknown>>(
    `SELECT * FROM request_history WHERE deleted = 0
     AND (url LIKE ? OR method LIKE ? OR CAST(status_code AS TEXT) LIKE ?)
     ORDER BY create_time DESC LIMIT ?`,
    [like, like, like, limit]
  ).map(rowToHistory)
}

/** Get the count of history records. */
export function getHistoryCount(): number {
  const row = get('SELECT COUNT(*) as count FROM request_history WHERE deleted = 0') as
    | { count: number }
    | undefined
  return row?.count ?? 0
}

/** Auto-cleanup: delete history older than retentionDays. */
export function cleanupOldHistory(retentionDays: number): number {
  return run(
    `UPDATE request_history SET deleted = 1
     WHERE create_time < datetime('now', ? || ' days')`,
    [`-${retentionDays}`]
  ).changes
}
