/**
 * Global variable repository — key-value store shared across all workspaces.
 */

import { all, get, run } from '../sqlite'
import type { GlobalVariable } from '@shared/types'

function rowToGlobalVar(row: Record<string, unknown>): GlobalVariable {
  return {
    key: row.key as string,
    value: row.value as string,
    description: (row.description as string) || undefined
  }
}

export function listGlobalVars(): GlobalVariable[] {
  return all<Record<string, unknown>>(
    'SELECT * FROM global_variable WHERE enabled = 1 ORDER BY key ASC'
  ).map(rowToGlobalVar)
}

export function saveGlobalVar(key: string, value: string, description?: string): void {
  const now = new Date().toISOString()
  const existing = get('SELECT key FROM global_variable WHERE key = ?', [key])
  if (existing) {
    run('UPDATE global_variable SET value = ?, description = ?, update_time = ? WHERE key = ?', [
      value,
      description || '',
      now,
      key
    ])
  } else {
    run(
      'INSERT INTO global_variable (key, value, description, enabled, create_time, update_time) VALUES (?, ?, ?, 1, ?, ?)',
      [key, value, description || '', now, now]
    )
  }
}

export function deleteGlobalVar(key: string): void {
  run('DELETE FROM global_variable WHERE key = ?', [key])
}

export function getGlobalVarMap(): Record<string, string> {
  const vars = listGlobalVars()
  const map: Record<string, string> = {}
  for (const v of vars) {
    map[v.key] = v.value
  }
  return map
}
