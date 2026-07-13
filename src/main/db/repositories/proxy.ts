/**
 * Proxy repository — CRUD for the proxy_config table.
 */

import { v4 as uuidv4 } from 'uuid'
import { all, get, run } from '../sqlite'
import type { ProxyConfig } from '@shared/types'

function rowToProxy(row: Record<string, unknown>): ProxyConfig {
  return {
    id: row.id as string,
    name: row.name as string,
    type: (row.proxy_type as ProxyConfig['type']) || 'http',
    host: row.host as string,
    port: (row.port as number) || 8080,
    username: (row.username as string) || undefined,
    password: (row.password as string) || undefined,
    isActive: Boolean(row.is_active),
    createTime: row.create_time as string,
    updateTime: row.update_time as string
  }
}

export function listProxies(): ProxyConfig[] {
  return all<Record<string, unknown>>('SELECT * FROM proxy_config ORDER BY name ASC').map(
    rowToProxy
  )
}

export function getProxy(id: string): ProxyConfig | undefined {
  const row = get('SELECT * FROM proxy_config WHERE id = ?', [id]) as
    | Record<string, unknown>
    | undefined
  return row ? rowToProxy(row) : undefined
}

export function createProxy(
  data: Omit<ProxyConfig, 'id' | 'isActive' | 'createTime' | 'updateTime'>
): ProxyConfig {
  const id = uuidv4()
  const now = new Date().toISOString()
  run(
    `INSERT INTO proxy_config (id, name, proxy_type, host, port, username, password, is_active, create_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
    [
      id,
      data.name,
      data.type,
      data.host,
      data.port,
      data.username || '',
      data.password || '',
      now,
      now
    ]
  )
  return getProxy(id)!
}

export function updateProxy(id: string, data: Partial<ProxyConfig>): void {
  const now = new Date().toISOString()
  const fields: string[] = []
  const values: unknown[] = []

  if (data.name !== undefined) {
    fields.push('name = ?')
    values.push(data.name)
  }
  if (data.type !== undefined) {
    fields.push('proxy_type = ?')
    values.push(data.type)
  }
  if (data.host !== undefined) {
    fields.push('host = ?')
    values.push(data.host)
  }
  if (data.port !== undefined) {
    fields.push('port = ?')
    values.push(data.port)
  }
  if (data.username !== undefined) {
    fields.push('username = ?')
    values.push(data.username)
  }
  if (data.password !== undefined) {
    fields.push('password = ?')
    values.push(data.password)
  }
  if (data.isActive !== undefined) {
    fields.push('is_active = ?')
    values.push(data.isActive ? 1 : 0)
  }

  if (fields.length === 0) return

  fields.push('update_time = ?')
  values.push(now)
  values.push(id)

  run(`UPDATE proxy_config SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteProxy(id: string): void {
  run('DELETE FROM proxy_config WHERE id = ?', [id])
}
