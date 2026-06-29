/**
 * Database helper utilities — reduce boilerplate in repository UPDATE operations.
 *
 * `buildUpdate` takes a column-to-value mapping and an optional column-to-transform
 * mapping, and returns the SET clause SQL plus parameter array.
 *
 * Usage:
 *   const { sql, params } = buildUpdate(
 *     { name: 'new', starred: true },
 *     collectionColumnMap
 *   )
 *   const result = run(`UPDATE t SET ${sql}, update_time = datetime('now') WHERE id = ?`, [...params, id])
 */

export interface ColumnMapping {
  /** JS object key → SQL column name. Default: same as key. */
  column?: string
  /** Transform the value before binding. Return undefined to skip this field. */
  transform?: (value: unknown) => unknown
}

export type ColumnMap = Record<string, ColumnMapping | string>

/**
 * Build a SET clause from a partial data object.
 *
 * @param data - Partial object with values to update
 * @param columnMap - Maps JS keys to SQL columns and optional transforms.
 *   Use a string for 1:1 key→column mapping, or { column, transform } for custom.
 * @returns SQL fragment and parameter array, or null if no fields to update.
 */
export function buildUpdate(
  data: Record<string, unknown>,
  columnMap: ColumnMap
): { sql: string; params: unknown[] } | null {
  const parts: string[] = []
  const params: unknown[] = []

  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue

    const mapping = columnMap[key]
    if (!mapping) continue

    const col = typeof mapping === 'string' ? mapping : (mapping.column ?? key)
    const transform = typeof mapping === 'string' ? undefined : mapping.transform

    const finalValue = transform ? transform(value) : value
    if (finalValue === undefined) continue

    parts.push(`${col} = ?`)
    params.push(finalValue)
  }

  if (parts.length === 0) return null

  return { sql: parts.join(', '), params }
}

// ---------------------------------------------------------------------------
// Common column maps for reuse across repository functions
// ---------------------------------------------------------------------------

export const collectionColumnMap: ColumnMap = {
  name: 'name',
  description: 'description',
  starred: { column: 'starred', transform: (v) => (v ? 1 : 0) },
  sort: 'sort'
}

export const folderColumnMap: ColumnMap = {
  name: 'name',
  parentId: 'parent_id',
  sort: 'sort'
}

export const requestColumnMap: ColumnMap = {
  name: 'name',
  description: 'description',
  method: 'method',
  url: 'url',
  collectionId: 'collection_id',
  folderId: 'folder_id',
  starred: { column: 'starred', transform: (v) => (v ? 1 : 0) },
  sort: 'sort'
}

export const environmentColumnMap: ColumnMap = {
  name: 'name',
  isGlobal: { column: 'is_global', transform: (v) => (v ? 1 : 0) },
  isActive: { column: 'is_active', transform: (v) => (v ? 1 : 0) },
  sort: 'sort'
}

export const configColumnMap: ColumnMap = {
  theme: 'theme',
  timeout: 'timeout',
  ignoreSSL: { column: 'ignore_ssl', transform: (v) => (v ? 1 : 0) },
  enableProxy: { column: 'enable_proxy', transform: (v) => (v ? 1 : 0) },
  proxyUrl: 'proxy_url',
  historyRetention: 'history_retention',
  layoutSplitPercent: 'layout_split_percent'
}
