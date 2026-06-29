/**
 * Cookie repository — CRUD for local_cookie table.
 */

import { v4 as uuidv4 } from 'uuid'
import { all, get, run } from '../sqlite'
import type { CookieInfo } from '@shared/types'

function rowToCookie(row: Record<string, unknown>): CookieInfo {
  return {
    domain: row.domain as string,
    name: row.cookie_name as string,
    value: row.cookie_value as string,
    path: (row.path as string) || '/',
    expires: (row.expire_time as string) || undefined,
    httpOnly: false,
    secure: false
  }
}

/** List all cookies for a domain. If no domain specified, lists all. */
export function listCookies(domain?: string): CookieInfo[] {
  if (domain) {
    return all<Record<string, unknown>>(
      `SELECT * FROM local_cookie WHERE domain = ? ORDER BY cookie_name ASC`,
      [domain]
    ).map(rowToCookie)
  }

  return all<Record<string, unknown>>(
    `SELECT * FROM local_cookie ORDER BY domain ASC, cookie_name ASC`
  ).map(rowToCookie)
}

/** Save or update a cookie. */
export function saveCookie(cookie: CookieInfo): void {
  const existing = get(
    'SELECT id FROM local_cookie WHERE domain = ? AND cookie_name = ? AND path = ?',
    [cookie.domain, cookie.name, cookie.path]
  ) as { id: string } | undefined

  const now = new Date().toISOString()

  if (existing) {
    run(
      `UPDATE local_cookie SET cookie_value = ?, expire_time = ?, update_time = ?
       WHERE id = ?`,
      [cookie.value, cookie.expires || null, now, existing.id]
    )
  } else {
    run(
      `INSERT INTO local_cookie (id, domain, cookie_name, cookie_value, expire_time, path, create_time, update_time)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        cookie.domain,
        cookie.name,
        cookie.value,
        cookie.expires || null,
        cookie.path || '/',
        now,
        now
      ]
    )
  }
}

/** Batch save cookies (upsert by domain + name + path). */
export function batchSaveCookies(cookies: CookieInfo[]): void {
  for (const cookie of cookies) {
    saveCookie(cookie)
  }
}

/** Delete a specific cookie. */
export function deleteCookie(domain: string, name: string, path = '/'): boolean {
  return (
    run('DELETE FROM local_cookie WHERE domain = ? AND cookie_name = ? AND path = ?', [
      domain,
      name,
      path
    ]).changes > 0
  )
}

/** Clear all cookies for a domain, or all cookies if no domain specified. */
export function clearCookies(domain?: string): number {
  if (domain) {
    return run('DELETE FROM local_cookie WHERE domain = ?', [domain]).changes
  }
  return run('DELETE FROM local_cookie').changes
}
