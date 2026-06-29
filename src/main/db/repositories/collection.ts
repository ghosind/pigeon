/**
 * Collection & request repository — CRUD for collection, collection_folder,
 * and http_request tables, plus all related sub-tables (params, headers,
 * body, form items, auth, settings, test script).
 *
 * This is the most complex repository as it handles the tree structure
 * of collections → folders → requests and all nested sub-entities.
 */

import { v4 as uuidv4 } from 'uuid'
import { all, get, run, transaction } from '../sqlite'
import { BodyMode } from '@shared/types'
import { buildUpdate, collectionColumnMap, folderColumnMap, requestColumnMap } from '../helpers'
import type {
  Collection,
  CollectionFolder,
  RequestModel,
  KeyValuePair,
  HTTPAuthorization,
  HTTPBody,
  HTTPSettings,
  TestScript,
  HTTPMethod,
  AuthType,
  RawType
} from '@shared/types'

// =========================================================================
// Collection CRUD
// =========================================================================

function rowToCollection(row: Record<string, unknown>): Collection {
  return {
    id: row.id as string,
    name: row.name as string,
    description: (row.description as string) || '',
    starred: Boolean(row.starred),
    sort: (row.sort as number) || 0,
    deleted: Boolean(row.deleted),
    createTime: row.create_time as string,
    updateTime: row.update_time as string
  }
}

export function listCollections(): Collection[] {
  return all<Record<string, unknown>>(
    `SELECT * FROM collection WHERE deleted = 0 ORDER BY starred DESC, sort ASC, name ASC`
  ).map(rowToCollection)
}

export function getCollection(id: string): Collection | undefined {
  const row = get('SELECT * FROM collection WHERE id = ? AND deleted = 0', [id]) as
    | Record<string, unknown>
    | undefined
  return row ? rowToCollection(row) : undefined
}

export function createCollection(name: string, description = ''): Collection {
  const id = uuidv4()
  const now = new Date().toISOString()
  const maxSort = (
    get('SELECT MAX(sort) as maxSort FROM collection WHERE deleted = 0') as
      | { maxSort: number | null }
      | undefined
  )?.maxSort

  run(
    `INSERT INTO collection (id, name, description, sort, create_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, name, description, (maxSort ?? 0) + 1, now, now]
  )

  return {
    id,
    name,
    description,
    starred: false,
    sort: (maxSort ?? 0) + 1,
    deleted: false,
    createTime: now,
    updateTime: now
  }
}

export function updateCollection(
  id: string,
  data: Partial<Pick<Collection, 'name' | 'description' | 'starred' | 'sort'>>
): boolean {
  const built = buildUpdate(data as Record<string, unknown>, collectionColumnMap)
  if (!built) return false

  return (
    run(`UPDATE collection SET ${built.sql}, update_time = datetime('now') WHERE id = ?`, [
      ...built.params,
      id
    ]).changes > 0
  )
}

export function deleteCollection(id: string): boolean {
  return transaction(() => {
    // Soft-delete all requests in folders under this collection
    run(
      `UPDATE http_request SET deleted = 1, update_time = datetime('now')
       WHERE collection_id = ?`,
      [id]
    )
    // Soft-delete all folders
    run(
      `UPDATE collection_folder SET deleted = 1, update_time = datetime('now')
       WHERE collection_id = ?`,
      [id]
    )
    // Soft-delete the collection itself
    return (
      run(`UPDATE collection SET deleted = 1, update_time = datetime('now') WHERE id = ?`, [id])
        .changes > 0
    )
  })
}

// =========================================================================
// Folder CRUD
// =========================================================================

function rowToFolder(row: Record<string, unknown>): CollectionFolder {
  return {
    id: row.id as string,
    collectionId: row.collection_id as string,
    parentId: (row.parent_id as string) || null,
    name: row.name as string,
    sort: (row.sort as number) || 0,
    deleted: Boolean(row.deleted),
    createTime: row.create_time as string,
    updateTime: row.update_time as string
  }
}

export function listFolders(
  collectionId: string,
  parentId: string | null = null
): CollectionFolder[] {
  if (parentId) {
    return all<Record<string, unknown>>(
      `SELECT * FROM collection_folder
       WHERE collection_id = ? AND parent_id = ? AND deleted = 0
       ORDER BY sort ASC, name ASC`,
      [collectionId, parentId]
    ).map(rowToFolder)
  }

  return all<Record<string, unknown>>(
    `SELECT * FROM collection_folder
     WHERE collection_id = ? AND parent_id IS NULL AND deleted = 0
     ORDER BY sort ASC, name ASC`,
    [collectionId]
  ).map(rowToFolder)
}

export function getFolder(id: string): CollectionFolder | undefined {
  const row = get('SELECT * FROM collection_folder WHERE id = ? AND deleted = 0', [id]) as
    | Record<string, unknown>
    | undefined
  return row ? rowToFolder(row) : undefined
}

export function createFolder(
  collectionId: string,
  name: string,
  parentId: string | null = null
): CollectionFolder {
  const id = uuidv4()
  const now = new Date().toISOString()

  run(
    `INSERT INTO collection_folder (id, collection_id, parent_id, name, create_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [id, collectionId, parentId, name, now, now]
  )

  return {
    id,
    collectionId,
    parentId,
    name,
    sort: 0,
    deleted: false,
    createTime: now,
    updateTime: now
  }
}

export function updateFolder(
  id: string,
  data: Partial<Pick<CollectionFolder, 'name' | 'parentId' | 'sort'>>
): boolean {
  const built = buildUpdate(data as Record<string, unknown>, folderColumnMap)
  if (!built) return false

  return (
    run(`UPDATE collection_folder SET ${built.sql}, update_time = datetime('now') WHERE id = ?`, [
      ...built.params,
      id
    ]).changes > 0
  )
}

export function deleteFolder(id: string): boolean {
  return transaction(() => {
    // Collect all descendant folder IDs recursively via BFS
    const descendantIds: string[] = [id]
    const queue = [id]
    while (queue.length > 0) {
      const current = queue.shift()!
      const children = all<{ id: string }>(
        'SELECT id FROM collection_folder WHERE parent_id = ? AND deleted = 0',
        [current]
      )
      for (const child of children) {
        descendantIds.push(child.id)
        queue.push(child.id)
      }
    }

    // Soft-delete requests in all descendant folders
    for (const folderId of descendantIds) {
      run(
        `UPDATE http_request SET deleted = 1, update_time = datetime('now') WHERE folder_id = ?`,
        [folderId]
      )
    }

    // Soft-delete all descendant folders
    for (const folderId of descendantIds) {
      run(`UPDATE collection_folder SET deleted = 1, update_time = datetime('now') WHERE id = ?`, [
        folderId
      ])
    }

    return true
  })
}

// =========================================================================
// Request CRUD
// =========================================================================

function rowToRequest(row: Record<string, unknown>): RequestModel {
  return {
    id: row.id as string,
    name: (row.name as string) || '',
    description: (row.description as string) || '',
    method: (row.method as HTTPMethod) || 'GET',
    url: (row.url as string) || '',
    collectionId: (row.collection_id as string) || undefined,
    folderId: (row.folder_id as string) || undefined,
    starred: Boolean(row.starred),
    sort: (row.sort as number) || 0,
    deleted: Boolean(row.deleted),
    createTime: row.create_time as string,
    updateTime: row.update_time as string
  }
}

export function listRequests(collectionId?: string, folderId?: string): RequestModel[] {
  let sql = 'SELECT * FROM http_request WHERE deleted = 0'
  const params: unknown[] = []

  if (folderId) {
    sql += ' AND folder_id = ?'
    params.push(folderId)
  } else if (collectionId) {
    sql += ' AND collection_id = ? AND folder_id IS NULL'
    params.push(collectionId)
  }

  sql += ' ORDER BY starred DESC, sort ASC, name ASC'

  return all<Record<string, unknown>>(sql, params).map(rowToRequest)
}

export function getRequest(id: string): RequestModel | undefined {
  const row = get('SELECT * FROM http_request WHERE id = ? AND deleted = 0', [id]) as
    | Record<string, unknown>
    | undefined
  return row ? rowToRequest(row) : undefined
}

export function getFullRequest(id: string): RequestModel | undefined {
  const req = getRequest(id)
  if (!req) return undefined

  req.params = getRequestParams(id)
  req.headers = getRequestHeaders(id)
  req.auth = getRequestAuth(id)
  req.body = getRequestBody(id)
  req.settings = getRequestSettings(id)

  return req
}

export function createRequest(
  data: Partial<
    Pick<RequestModel, 'name' | 'description' | 'method' | 'url' | 'collectionId' | 'folderId'>
  >
): RequestModel {
  const id = uuidv4()
  const now = new Date().toISOString()

  run(
    `INSERT INTO http_request (id, collection_id, folder_id, name, method, url, description, create_time, update_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id,
      data.collectionId || null,
      data.folderId || null,
      data.name || '',
      data.method || 'GET',
      data.url || '',
      data.description || '',
      now,
      now
    ]
  )

  return {
    id,
    name: data.name || '',
    description: data.description || '',
    method: (data.method as HTTPMethod) || 'GET',
    url: data.url || '',
    collectionId: data.collectionId,
    folderId: data.folderId,
    starred: false,
    sort: 0,
    deleted: false,
    createTime: now,
    updateTime: now
  }
}

export function updateRequest(
  id: string,
  data: Partial<
    Pick<
      RequestModel,
      'name' | 'description' | 'method' | 'url' | 'collectionId' | 'folderId' | 'starred' | 'sort'
    >
  >
): boolean {
  const built = buildUpdate(data as Record<string, unknown>, requestColumnMap)
  if (!built) return false

  return (
    run(`UPDATE http_request SET ${built.sql}, update_time = datetime('now') WHERE id = ?`, [
      ...built.params,
      id
    ]).changes > 0
  )
}

export function deleteRequest(id: string): boolean {
  return (
    run(`UPDATE http_request SET deleted = 1, update_time = datetime('now') WHERE id = ?`, [id])
      .changes > 0
  )
}

export function duplicateRequest(sourceId: string): RequestModel | null {
  const source = getFullRequest(sourceId)
  if (!source) return null

  return transaction(() => {
    const newReq = createRequest({
      name: `${source.name} (Copy)`,
      description: source.description,
      method: source.method,
      url: source.url,
      collectionId: source.collectionId,
      folderId: source.folderId
    })

    if (source.params?.length) batchSaveParams(newReq.id, source.params)
    if (source.headers?.length) batchSaveHeaders(newReq.id, source.headers)
    if (source.auth) saveAuth(newReq.id, source.auth)
    if (source.body) saveBody(newReq.id, source.body)
    if (source.settings) saveSettings(newReq.id, source.settings)

    return {
      ...newReq,
      params: source.params,
      headers: source.headers,
      auth: source.auth,
      body: source.body,
      settings: source.settings
    }
  })
}

// =========================================================================
// Request Params
// =========================================================================

function rowToKv(row: Record<string, unknown>): KeyValuePair {
  return {
    id: row.id as string,
    key: row.key as string,
    value: row.value as string,
    description: (row.description as string) || '',
    enabled: Boolean(row.enabled),
    sort: (row.sort as number) || 0
  }
}

export function getRequestParams(requestId: string): KeyValuePair[] {
  return all<Record<string, unknown>>(
    'SELECT * FROM request_param WHERE request_id = ? AND deleted = 0 ORDER BY sort ASC',
    [requestId]
  ).map(rowToKv)
}

export function batchSaveParams(requestId: string, items: KeyValuePair[]): void {
  transaction(() => {
    run('UPDATE request_param SET deleted = 1 WHERE request_id = ?', [requestId])
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      run(
        `INSERT INTO request_param (id, request_id, key, value, description, enabled, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), requestId, item.key, item.value, item.description || '', item.enabled ? 1 : 0, i]
      )
    }
  })
}

// =========================================================================
// Request Headers
// =========================================================================

export function getRequestHeaders(requestId: string): KeyValuePair[] {
  return all<Record<string, unknown>>(
    'SELECT * FROM request_header WHERE request_id = ? AND deleted = 0 ORDER BY sort ASC',
    [requestId]
  ).map(rowToKv)
}

export function batchSaveHeaders(requestId: string, items: KeyValuePair[]): void {
  transaction(() => {
    run('UPDATE request_header SET deleted = 1 WHERE request_id = ?', [requestId])
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      run(
        `INSERT INTO request_header (id, request_id, key, value, description, enabled, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [uuidv4(), requestId, item.key, item.value, item.description || '', item.enabled ? 1 : 0, i]
      )
    }
  })
}

// =========================================================================
// Request Auth
// =========================================================================

export function getRequestAuth(requestId: string): HTTPAuthorization | undefined {
  const row = get('SELECT * FROM request_auth WHERE request_id = ? AND deleted = 0', [
    requestId
  ]) as Record<string, unknown> | undefined

  if (!row || (row.auth_type as string) === 'none') return undefined

  return {
    type: (row.auth_type as AuthType) || 'none',
    token: (row.token as string) || undefined,
    username: (row.username as string) || undefined,
    password: (row.password as string) || undefined
  }
}

export function saveAuth(requestId: string, auth: HTTPAuthorization): void {
  const existing = get('SELECT id FROM request_auth WHERE request_id = ? AND deleted = 0', [
    requestId
  ]) as { id: string } | undefined

  if (existing) {
    run(
      `UPDATE request_auth SET auth_type = ?, token = ?, username = ?, password = ?
       WHERE request_id = ?`,
      [auth.type, auth.token || '', auth.username || '', auth.password || '', requestId]
    )
  } else {
    run(
      `INSERT INTO request_auth (id, request_id, auth_type, token, username, password)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), requestId, auth.type, auth.token || '', auth.username || '', auth.password || '']
    )
  }
}

// =========================================================================
// Request Body
// =========================================================================

export function getRequestBody(requestId: string): HTTPBody | undefined {
  const row = get('SELECT * FROM request_body WHERE request_id = ? AND deleted = 0', [
    requestId
  ]) as Record<string, unknown> | undefined

  if (!row || (row.body_mode as string) === 'none') return undefined

  const body: HTTPBody = {
    mode: (row.body_mode as BodyMode) || 'none',
    rawType: (row.raw_type as RawType) || 'json',
    rawContent: (row.raw_content as string) || '',
    binaryPath: (row.binary_path as string) || ''
  }

  if (body.mode === 'formdata' || body.mode === 'urlencoded') {
    const items = getFormItems(row.id as string)
    if (body.mode === 'formdata') {
      body.formItems = items
    } else {
      body.urlEncodedItems = items
    }
  }

  return body
}

export function saveBody(requestId: string, body: HTTPBody): void {
  transaction(() => {
    const existing = get('SELECT id FROM request_body WHERE request_id = ? AND deleted = 0', [
      requestId
    ]) as { id: string } | undefined

    let bodyId: string

    if (existing) {
      bodyId = existing.id
      run(
        `UPDATE request_body SET body_mode = ?, raw_type = ?, raw_content = ?, binary_path = ?
         WHERE request_id = ?`,
        [body.mode, body.rawType || 'json', body.rawContent || '', body.binaryPath || '', requestId]
      )
    } else {
      bodyId = uuidv4()
      run(
        `INSERT INTO request_body (id, request_id, body_mode, raw_type, raw_content, binary_path)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [
          bodyId,
          requestId,
          body.mode,
          body.rawType || 'json',
          body.rawContent || '',
          body.binaryPath || ''
        ]
      )
    }

    // Clean up existing form items if mode doesn't use them
    if (body.mode !== BodyMode.FormData && body.mode !== BodyMode.UrlEncoded) {
      run('UPDATE request_form_item SET deleted = 1 WHERE body_id = ?', [bodyId])
      return
    }

    // Save form items if applicable
    const items = body.mode === BodyMode.FormData ? body.formItems : body.urlEncodedItems
    if (items) {
      batchSaveFormItems(bodyId, items)
    }
  })
}

// =========================================================================
// Form Items
// =========================================================================

export function getFormItems(bodyId: string): KeyValuePair[] {
  return all<Record<string, unknown>>(
    'SELECT * FROM request_form_item WHERE body_id = ? AND deleted = 0 ORDER BY sort ASC',
    [bodyId]
  ).map((row) => ({
    id: row.id as string,
    key: row.key as string,
    value: row.value as string,
    description: '',
    enabled: Boolean(row.enabled),
    sort: (row.sort as number) || 0
  }))
}

export function batchSaveFormItems(bodyId: string, items: KeyValuePair[]): void {
  transaction(() => {
    run('UPDATE request_form_item SET deleted = 1 WHERE body_id = ?', [bodyId])
    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      run(
        `INSERT INTO request_form_item (id, body_id, key, value, file_path, item_type, enabled, sort)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          uuidv4(),
          bodyId,
          item.key,
          item.value,
          item.type === 'file' ? item.value : '',
          item.type || 'text',
          item.enabled ? 1 : 0,
          i
        ]
      )
    }
  })
}

// =========================================================================
// Request Settings
// =========================================================================

export function getRequestSettings(requestId: string): HTTPSettings | undefined {
  const row = get('SELECT * FROM request_setting WHERE request_id = ? AND deleted = 0', [
    requestId
  ]) as Record<string, unknown> | undefined

  if (!row) return undefined

  return {
    timeout: (row.timeout as number) || 0,
    followRedirect: Boolean(row.follow_redirect),
    ignoreSSL: Boolean(row.ignore_ssl),
    useProxy: Boolean(row.use_proxy),
    proxyUrl: (row.proxy_url as string) || undefined
  }
}

export function saveSettings(requestId: string, settings: HTTPSettings): void {
  const existing = get('SELECT id FROM request_setting WHERE request_id = ? AND deleted = 0', [
    requestId
  ]) as { id: string } | undefined

  if (existing) {
    run(
      `UPDATE request_setting SET timeout = ?, follow_redirect = ?, ignore_ssl = ?,
       use_proxy = ?, proxy_url = ? WHERE request_id = ?`,
      [
        settings.timeout,
        settings.followRedirect ? 1 : 0,
        settings.ignoreSSL ? 1 : 0,
        settings.useProxy ? 1 : 0,
        settings.proxyUrl || '',
        requestId
      ]
    )
  } else {
    run(
      `INSERT INTO request_setting (id, request_id, timeout, follow_redirect, ignore_ssl, use_proxy, proxy_url)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        requestId,
        settings.timeout,
        settings.followRedirect ? 1 : 0,
        settings.ignoreSSL ? 1 : 0,
        settings.useProxy ? 1 : 0,
        settings.proxyUrl || ''
      ]
    )
  }
}

// =========================================================================
// Test Script
// =========================================================================

export function getTestScript(requestId: string): TestScript | undefined {
  const row = get('SELECT * FROM request_test_script WHERE request_id = ? AND deleted = 0', [
    requestId
  ]) as Record<string, unknown> | undefined

  if (!row) return undefined

  return {
    id: row.id as string,
    requestId: row.request_id as string,
    scriptContent: row.script_content as string,
    deleted: Boolean(row.deleted),
    updateTime: row.update_time as string
  }
}

export function saveTestScript(requestId: string, scriptContent: string): TestScript {
  const existing = get('SELECT id FROM request_test_script WHERE request_id = ? AND deleted = 0', [
    requestId
  ]) as { id: string } | undefined

  const now = new Date().toISOString()

  if (existing) {
    run(`UPDATE request_test_script SET script_content = ?, update_time = ? WHERE request_id = ?`, [
      scriptContent,
      now,
      requestId
    ])
    return { id: existing.id, requestId, scriptContent, deleted: false, updateTime: now }
  }

  const id = uuidv4()
  run(
    `INSERT INTO request_test_script (id, request_id, script_content, update_time)
     VALUES (?, ?, ?, ?)`,
    [id, requestId, scriptContent, now]
  )
  return { id, requestId, scriptContent, deleted: false, updateTime: now }
}

export function deleteTestScript(requestId: string): boolean {
  return (
    run(
      `UPDATE request_test_script SET deleted = 1, update_time = datetime('now') WHERE request_id = ?`,
      [requestId]
    ).changes > 0
  )
}

// =========================================================================
// Global search
// =========================================================================

export function searchAll(
  keyword: string,
  limit = 50
): {
  collections: Collection[]
  folders: CollectionFolder[]
  requests: RequestModel[]
  envVars: { envName: string; key: string; value: string }[]
} {
  const like = `%${keyword}%`

  const collections = all<Record<string, unknown>>(
    `SELECT * FROM collection WHERE deleted = 0 AND (name LIKE ? OR description LIKE ?) LIMIT ?`,
    [like, like, limit]
  ).map(rowToCollection)

  const folders = all<Record<string, unknown>>(
    `SELECT * FROM collection_folder WHERE deleted = 0 AND name LIKE ? LIMIT ?`,
    [like, limit]
  ).map(rowToFolder)

  const requests = all<Record<string, unknown>>(
    `SELECT * FROM http_request WHERE deleted = 0 AND (name LIKE ? OR url LIKE ? OR description LIKE ?) LIMIT ?`,
    [like, like, like, limit]
  ).map(rowToRequest)

  const envVars = all<Record<string, unknown>>(
    `SELECT e.name as envName, v.key, v.value
     FROM env_variable v
     JOIN environment e ON v.env_id = e.id
     WHERE v.deleted = 0 AND e.deleted = 0 AND (v.key LIKE ? OR v.value LIKE ?)
     LIMIT ?`,
    [like, like, limit]
  ) as { envName: string; key: string; value: string }[]

  return { collections, folders, requests, envVars }
}
