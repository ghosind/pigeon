/**
 * Workspace repository — CRUD for the workspace table.
 */

import { v4 as uuidv4 } from 'uuid'
import { all, get, run } from '../sqlite'
import type { Workspace } from '@shared/types'

function rowToWorkspace(row: Record<string, unknown>): Workspace {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || '',
    createTime: row.create_time as string,
    updateTime: row.update_time as string
  }
}

export function listWorkspaces(): Workspace[] {
  return all<Record<string, unknown>>('SELECT * FROM workspace ORDER BY update_time DESC').map(
    rowToWorkspace
  )
}

export function getWorkspace(id: string): Workspace | undefined {
  const row = get('SELECT * FROM workspace WHERE id = ?', [id]) as
    | Record<string, unknown>
    | undefined
  return row ? rowToWorkspace(row) : undefined
}

export function createWorkspace(name: string, description = ''): Workspace {
  const id = uuidv4()
  const now = new Date().toISOString()
  run(
    'INSERT INTO workspace (id, name, description, create_time, update_time) VALUES (?, ?, ?, ?, ?)',
    [id, name, description, now, now]
  )
  return getWorkspace(id)!
}

export function updateWorkspace(id: string, data: Partial<Workspace>): void {
  const now = new Date().toISOString()
  const fields: string[] = []
  const values: unknown[] = []

  if (data.name !== undefined) {
    fields.push('name = ?')
    values.push(data.name)
  }
  if (data.description !== undefined) {
    fields.push('description = ?')
    values.push(data.description)
  }

  if (fields.length === 0) return

  fields.push('update_time = ?')
  values.push(now)
  values.push(id)

  run(`UPDATE workspace SET ${fields.join(', ')} WHERE id = ?`, values)
}

export function deleteWorkspace(id: string): void {
  run('DELETE FROM workspace WHERE id = ?', [id])
}
