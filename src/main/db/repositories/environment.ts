/**
 * Environment repository — CRUD for environment + env_variable tables.
 */

import { v4 as uuidv4 } from 'uuid'
import { all, get, run, transaction } from '../sqlite'
import { buildUpdate, environmentColumnMap } from '../helpers'
import type { Environment, EnvironmentVariable } from '@shared/types'

// ---------------------------------------------------------------------------
// Environment CRUD
// ---------------------------------------------------------------------------

function rowToEnv(row: Record<string, unknown>): Environment {
  return {
    id: row.id as string,
    name: row.name as string,
    isGlobal: Boolean(row.is_global),
    isActive: Boolean(row.is_active),
    sort: (row.sort as number) || 0,
    deleted: Boolean(row.deleted),
    createTime: row.create_time as string,
    updateTime: row.update_time as string
  }
}

/** List all non-deleted environments, ordered by sort. */
export function listEnvironments(): Environment[] {
  return all<Record<string, unknown>>(
    'SELECT * FROM environment WHERE deleted = 0 ORDER BY sort ASC, name ASC'
  ).map(rowToEnv)
}

/** Get a single environment by ID. */
export function getEnvironment(id: string): Environment | undefined {
  const row = get('SELECT * FROM environment WHERE id = ? AND deleted = 0', [id]) as
    | Record<string, unknown>
    | undefined
  return row ? rowToEnv(row) : undefined
}

/** Create a new environment. Returns the created entity. */
export function createEnvironment(name: string, isGlobal = false, isActive = false): Environment {
  const id = uuidv4()
  const now = new Date().toISOString()
  const maxSort = (
    get('SELECT MAX(sort) as maxSort FROM environment WHERE deleted = 0') as
      | { maxSort: number | null }
      | undefined
  )?.maxSort

  run(
    `INSERT INTO environment (id, name, is_global, is_active, sort, create_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, name, isGlobal ? 1 : 0, isActive ? 1 : 0, (maxSort ?? 0) + 1, now, now]
  )

  return {
    id,
    name,
    isGlobal,
    isActive,
    sort: (maxSort ?? 0) + 1,
    deleted: false,
    createTime: now,
    updateTime: now
  }
}

/** Update an environment's properties. */
export function updateEnvironment(
  id: string,
  data: Partial<Pick<Environment, 'name' | 'isGlobal' | 'isActive' | 'sort'>>
): boolean {
  const built = buildUpdate(data as Record<string, unknown>, environmentColumnMap)
  if (!built) return false

  return (
    run(`UPDATE environment SET ${built.sql}, update_time = datetime('now') WHERE id = ?`, [
      ...built.params,
      id
    ]).changes > 0
  )
}

/** Soft-delete an environment. */
export function deleteEnvironment(id: string): boolean {
  const result = run(
    "UPDATE environment SET deleted = 1, update_time = datetime('now') WHERE id = ?",
    [id]
  )
  return result.changes > 0
}

/** Duplicate an environment (including its variables). */
export function duplicateEnvironment(sourceId: string, newName: string): Environment | null {
  const source = getEnvironment(sourceId)
  if (!source) return null

  return transaction(() => {
    const newEnv = createEnvironment(newName, source.isGlobal, false)

    const vars = listVariables(sourceId)
    if (vars.length > 0) {
      batchSaveVariables(newEnv.id, vars)
    }

    return newEnv
  })
}

/** Activate an environment and deactivate all others. */
export function activateEnvironment(id: string): void {
  transaction(() => {
    run("UPDATE environment SET is_active = 0, update_time = datetime('now')")
    run(
      "UPDATE environment SET is_active = 1, update_time = datetime('now') WHERE id = ? AND deleted = 0",
      [id]
    )
  })
}

/** Get the currently active environment. */
export function getActiveEnvironment(): Environment | undefined {
  const row = get('SELECT * FROM environment WHERE is_active = 1 AND deleted = 0 LIMIT 1') as
    | Record<string, unknown>
    | undefined
  return row ? rowToEnv(row) : undefined
}

// ---------------------------------------------------------------------------
// Variable CRUD
// ---------------------------------------------------------------------------

function rowToVar(row: Record<string, unknown>): EnvironmentVariable {
  return {
    id: row.id as string,
    envId: row.env_id as string,
    key: row.key as string,
    value: row.value as string,
    description: (row.description as string) || '',
    enabled: Boolean(row.enabled),
    deleted: Boolean(row.deleted),
    createTime: row.create_time as string,
    updateTime: row.update_time as string
  }
}

/** List all non-deleted variables for an environment. */
export function listVariables(envId: string): EnvironmentVariable[] {
  return all<Record<string, unknown>>(
    'SELECT * FROM env_variable WHERE env_id = ? AND deleted = 0 ORDER BY key ASC',
    [envId]
  ).map(rowToVar)
}

/** Get all variables from the currently active environment. */
export function getActiveVariables(): EnvironmentVariable[] {
  const activeEnv = getActiveEnvironment()
  if (!activeEnv) return []

  // Also include global environment variables
  const globalEnv = (
    get('SELECT id FROM environment WHERE is_global = 1 AND deleted = 0 LIMIT 1') as
      | { id: string }
      | undefined
  )?.id

  let vars = listVariables(activeEnv.id)

  if (globalEnv && globalEnv !== activeEnv.id) {
    const globalVars = listVariables(globalEnv)
    // Environment variables override global ones with the same key
    const envKeys = new Set(vars.map((v) => v.key))
    vars = [...globalVars.filter((v) => !envKeys.has(v.key)), ...vars]
  }

  return vars.filter((v) => v.enabled)
}

/** Save or update a single variable (upsert by env_id + key). */
export function saveVariable(
  variable: Omit<EnvironmentVariable, 'createTime' | 'updateTime'>
): EnvironmentVariable {
  const now = new Date().toISOString()
  const existing = get('SELECT id FROM env_variable WHERE env_id = ? AND key = ? AND deleted = 0', [
    variable.envId,
    variable.key
  ]) as { id: string } | undefined

  if (existing) {
    run(
      `UPDATE env_variable SET value = ?, description = ?, enabled = ?, update_time = ?
       WHERE id = ?`,
      [variable.value, variable.description || '', variable.enabled ? 1 : 0, now, existing.id]
    )
    return { ...variable, id: existing.id, createTime: now, updateTime: now }
  }

  const id = uuidv4()
  run(
    `INSERT INTO env_variable (id, env_id, key, value, description, enabled, create_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      variable.envId,
      variable.key,
      variable.value,
      variable.description || '',
      variable.enabled ? 1 : 0,
      now,
      now
    ]
  )

  return { ...variable, id, createTime: now, updateTime: now }
}

/** Batch save variables (replace all for an environment within a transaction). */
export function batchSaveVariables(
  envId: string,
  variables: Omit<EnvironmentVariable, 'id' | 'envId' | 'createTime' | 'updateTime'>[]
): void {
  transaction(() => {
    // Soft-delete existing variables
    run("UPDATE env_variable SET deleted = 1, update_time = datetime('now') WHERE env_id = ?", [
      envId
    ])

    // Insert new ones
    const now = new Date().toISOString()
    for (const v of variables) {
      const id = uuidv4()
      run(
        `INSERT INTO env_variable (id, env_id, key, value, description, enabled, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, envId, v.key, v.value, v.description || '', v.enabled ? 1 : 0, now, now]
      )
    }
  })
}

/** Soft-delete a single variable. */
export function deleteVariable(id: string): boolean {
  const result = run(
    "UPDATE env_variable SET deleted = 1, update_time = datetime('now') WHERE id = ?",
    [id]
  )
  return result.changes > 0
}

/** Get all variable key-value pairs across active environments as a flat map. */
export function getVariableMap(): Record<string, string> {
  const vars = getActiveVariables()
  const map: Record<string, string> = {}
  for (const v of vars) {
    map[v.key] = v.value
  }
  return map
}
