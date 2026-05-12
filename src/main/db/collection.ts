import { all, exec, run } from './sqlite'
import { CollectionNode, Request } from '@shared/types'

type CollectionRecordRow = {
  node_id: string
  parent_id: string | null
  sort_order: number
  node_type: 'folder' | 'request'
  payload: string
}

type LegacyCollectionRow = {
  value: string
}

type TableInfoRow = {
  name: string
}

type FlatCollectionNode = {
  nodeId: string
  parentId: string | null
  sortOrder: number
  nodeType: 'folder' | 'request'
  payload: string
  title: string | null
  requestId: string | null
  requestMethod: string | null
  requestUrl: string | null
  updatedAt: number
}

function createCollectionsTable(): void {
  exec(`CREATE TABLE IF NOT EXISTS collections (
node_id TEXT PRIMARY KEY,
parent_id TEXT,
sort_order INTEGER NOT NULL,
node_type TEXT NOT NULL CHECK (node_type IN ('folder', 'request')),
title TEXT,
request_id TEXT,
request_method TEXT,
request_url TEXT,
payload TEXT NOT NULL,
updated_at INTEGER NOT NULL
);`)

  exec(`CREATE INDEX IF NOT EXISTS idx_collections_parent_order
ON collections(parent_id, sort_order);`)
  exec(`CREATE INDEX IF NOT EXISTS idx_collections_type_title
ON collections(node_type, title);`)
  exec(`CREATE INDEX IF NOT EXISTS idx_collections_request_id
ON collections(request_id);`)
}

function flattenCollectionNodes(
  nodes: CollectionNode[],
  parentId: string | null,
  updatedAt: number,
  out: FlatCollectionNode[]
): void {
  for (let i = 0; i < nodes.length; i += 1) {
    const node = nodes[i]
    const base: FlatCollectionNode = {
      nodeId: node.id,
      parentId,
      sortOrder: i,
      nodeType: node.type,
      payload: JSON.stringify(node),
      title: null,
      requestId: null,
      requestMethod: null,
      requestUrl: null,
      updatedAt
    }

    if (node.type === 'folder') {
      base.title = node.title
      out.push(base)
      flattenCollectionNodes(node.children, node.id, updatedAt, out)
      continue
    }

    base.title = node.request?.title ?? null
    base.requestId = node.request?.id ?? null
    base.requestMethod = node.request?.request?.method ?? null
    base.requestUrl = node.request?.request?.url ?? null
    out.push(base)
  }
}

function parseLegacyCollections(raw: string): CollectionNode[] {
  try {
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as CollectionNode[]) : []
  } catch (err) {
    console.error('Failed to parse legacy collections data from sqlite:', err)
    return []
  }
}

async function migrateLegacyCollectionsIfNeeded(): Promise<void> {
  const tableInfo = all<TableInfoRow>(`PRAGMA table_info(collections)`)
  if (!tableInfo.length) {
    createCollectionsTable()
    return
  }

  const columns = new Set(tableInfo.map((x) => x.name))
  if (columns.has('node_id') && columns.has('payload')) {
    createCollectionsTable()
    return
  }

  if (columns.has('id') && columns.has('value')) {
    const rows = all<LegacyCollectionRow>(`SELECT value FROM collections WHERE id = 1 LIMIT 1`)
    const legacy = rows.length ? parseLegacyCollections(rows[0].value) : []

    exec(`DROP TABLE IF EXISTS collections`)
    createCollectionsTable()
    await saveCollections(legacy)
    return
  }

  // Unknown schema: recreate as latest shape.
  exec(`DROP TABLE IF EXISTS collections`)
  createCollectionsTable()
}

export async function initCollectionsTable(): Promise<void> {
  await migrateLegacyCollectionsIfNeeded()
}

export async function saveCollections(list: CollectionNode[]): Promise<void> {
  const now = Date.now()
  const flat: FlatCollectionNode[] = []
  flattenCollectionNodes(list, null, now, flat)

  exec('BEGIN TRANSACTION')
  try {
    run(`DELETE FROM collections`)

    const sql = `INSERT INTO collections(
node_id, parent_id, sort_order, node_type, title, request_id, request_method, request_url, payload, updated_at
) VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`

    for (const row of flat) {
      run(sql, [
        row.nodeId,
        row.parentId,
        row.sortOrder,
        row.nodeType,
        row.title,
        row.requestId,
        row.requestMethod,
        row.requestUrl,
        row.payload,
        row.updatedAt
      ])
    }

    exec('COMMIT')
  } catch (err) {
    exec('ROLLBACK')
    throw err
  }
}

export async function loadCollections(): Promise<CollectionNode[]> {
  const rows = all<CollectionRecordRow>(`SELECT node_id, parent_id, sort_order, node_type, payload
FROM collections
ORDER BY sort_order ASC`)
  if (!rows.length) {
    return []
  }

  const byId = new Map<string, CollectionNode>()
  const childrenMap = new Map<string | null, Array<{ id: string; order: number }>>()

  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.payload) as Record<string, unknown>
      let normalized: CollectionNode

      if (row.node_type === 'folder') {
        normalized = {
          id: row.node_id,
          type: 'folder',
          title: typeof parsed.title === 'string' ? parsed.title : '',
          children: []
        }
      } else {
        const requestValue = parsed.request
        if (typeof requestValue !== 'object' || requestValue == null) {
          continue
        }
        normalized = {
          id: row.node_id,
          type: 'request',
          request: requestValue as Request
        }
      }

      byId.set(row.node_id, normalized)

      if (!childrenMap.has(row.parent_id)) {
        childrenMap.set(row.parent_id, [])
      }
      childrenMap.get(row.parent_id)?.push({ id: row.node_id, order: row.sort_order })
    } catch (err) {
      console.error(`Failed to parse collection node payload for node ${row.node_id}:`, err)
    }
  }

  for (const [parentId, entries] of childrenMap.entries()) {
    if (!parentId) {
      continue
    }

    const parent = byId.get(parentId)
    if (!parent || parent.type !== 'folder') {
      continue
    }

    const children = entries
      .sort((a, b) => a.order - b.order)
      .map((entry) => byId.get(entry.id))
      .filter((node): node is CollectionNode => Boolean(node))

    parent.children = children
  }

  const roots = (childrenMap.get(null) ?? [])
    .sort((a, b) => a.order - b.order)
    .map((entry) => byId.get(entry.id))
    .filter((node): node is CollectionNode => Boolean(node))

  return roots
}

export async function ensureCollectionsStore(): Promise<void> {
  await initCollectionsTable()
}
