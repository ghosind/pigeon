/**
 * exportGenerator — exports collections as Postman Collection or OpenAPI format.
 */

import type { Collection, CollectionFolder, RequestModel } from '@shared/types'
import { BodyMode } from '@shared/types'

/**
 * Export a collection with its folders and requests as a Postman Collection v2.1 JSON.
 */
export function exportAsPostman(
  collection: Collection,
  folders: CollectionFolder[],
  requests: RequestModel[]
): string {
  function buildItem(req: RequestModel): Record<string, unknown> {
    const item: Record<string, unknown> = {
      name: req.name,
      request: {
        method: req.method,
        header: (req.headers || []).map((h) => ({ key: h.key, value: h.value })),
        url: req.url
      }
    }

    const request = item.request as Record<string, unknown>

    // Body
    if (req.body && req.body.mode !== BodyMode.None) {
      const body: Record<string, unknown> = { mode: req.body.mode }
      if (req.body.mode === BodyMode.Raw) {
        body.raw = req.body.rawContent || ''
        body.options = { raw: { language: req.body.rawType || 'json' } }
      } else if (req.body.mode === BodyMode.FormData) {
        body.formdata = (req.body.formItems || []).map((f) => ({
          key: f.key,
          value: f.value,
          type: f.type || 'text'
        }))
      } else if (req.body.mode === BodyMode.UrlEncoded) {
        body.urlencoded = (req.body.urlEncodedItems || []).map((u) => ({
          key: u.key,
          value: u.value
        }))
      }
      request.body = body
    }

    // Auth
    if (req.auth && req.auth.type !== 'none') {
      if (req.auth.type === 'bearer') {
        request.auth = {
          type: 'bearer',
          bearer: [{ key: 'token', value: req.auth.token || '', type: 'string' }]
        }
      } else if (req.auth.type === 'basic') {
        request.auth = {
          type: 'basic',
          basic: [
            { key: 'username', value: req.auth.username || '', type: 'string' },
            { key: 'password', value: req.auth.password || '', type: 'string' }
          ]
        }
      }
    }

    return item
  }

  function buildFolderTree(parentId: string | null): Record<string, unknown>[] {
    const childFolders = folders.filter((f) => f.parentId === parentId)
    const childRequests = requests.filter((r) => r.folderId === parentId)

    const items: Record<string, unknown>[] = []

    for (const folder of childFolders) {
      items.push({
        name: folder.name,
        item: buildFolderTree(folder.id)
      })
    }

    for (const req of childRequests) {
      items.push(buildItem(req))
    }

    return items
  }

  const rootRequests = requests.filter((r) => !r.folderId)

  const postmanCollection = {
    info: {
      name: collection.name,
      description: collection.description || '',
      schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
    },
    item: [...buildFolderTree(null), ...rootRequests.map(buildItem)]
  }

  return JSON.stringify(postmanCollection, null, 2)
}

/**
 * Export a collection as OpenAPI 3.0 JSON.
 */
export function exportAsOpenAPI(
  collection: Collection,
  _folders: CollectionFolder[],
  requests: RequestModel[]
): string {
  const paths: Record<string, Record<string, Record<string, unknown>>> = {}

  for (const req of requests) {
    const url = new URL(req.url.startsWith('http') ? req.url : `http://localhost${req.url}`)
    const path = url.pathname || '/'

    if (!paths[path]) paths[path] = {}

    const method = req.method.toLowerCase()
    const operation: Record<string, unknown> = {
      summary: req.name,
      operationId: `${method}_${req.name.replace(/\s+/g, '_').toLowerCase()}`,
      responses: { '200': { description: 'Successful response' } }
    }

    // Parameters
    if (req.params && req.params.length > 0) {
      operation.parameters = req.params.map((p) => ({
        name: p.key,
        in: 'query',
        description: p.description || '',
        required: false
      }))
    }

    paths[path][method] = operation
  }

  const spec = {
    openapi: '3.0.3',
    info: {
      title: collection.name,
      description: collection.description || '',
      version: '1.0.0'
    },
    paths
  }

  return JSON.stringify(spec, null, 2)
}
