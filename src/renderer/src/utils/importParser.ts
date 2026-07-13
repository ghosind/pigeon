/**
 * importParser — parses Postman Collection, Swagger 2.0, and OpenAPI 3.x files.
 *
 * Converts external formats to Pigeon's internal Collection + RequestModel types.
 */

import { v4 as uuidv4 } from 'uuid'
import type { Collection, CollectionFolder, RequestModel, KeyValuePair } from '@shared/types'
import { HTTPMethod, BodyMode, AuthType, ItemType } from '@shared/types'

export interface ImportResult {
  collections: Collection[]
  folders: CollectionFolder[]
  requests: RequestModel[]
}

interface PostmanItem {
  name: string
  request?: {
    method?: string
    url?: string | { raw?: string; host?: string[]; path?: string[] }
    header?: { key: string; value: string }[]
    body?: {
      mode?: string
      raw?: string
      formdata?: { key: string; value: string; type?: string }[]
      urlencoded?: { key: string; value: string }[]
    }
  }
  item?: PostmanItem[]
}

/**
 * Parse a Postman Collection JSON (v2.0 / v2.1).
 */
export function parsePostmanCollection(json: string): ImportResult {
  const data = JSON.parse(json)
  const now = new Date().toISOString()

  const collection: Collection = {
    id: uuidv4(),
    name: data.info?.name || 'Imported Collection',
    description: data.info?.description || '',
    starred: false,
    sort: 0,
    deleted: false,
    createTime: now,
    updateTime: now
  }

  const folders: CollectionFolder[] = []
  const requests: RequestModel[] = []

  function processItems(items: PostmanItem[], parentFolderId: string | null = null): void {
    for (const item of items) {
      if (item.item && item.item.length > 0) {
        // It's a folder
        const folder: CollectionFolder = {
          id: uuidv4(),
          collectionId: collection.id,
          parentId: parentFolderId,
          name: item.name,
          sort: 0,
          deleted: false,
          createTime: now,
          updateTime: now
        }
        folders.push(folder)
        processItems(item.item, folder.id)
      } else if (item.request) {
        // It's a request
        const url =
          typeof item.request.url === 'string' ? item.request.url : item.request.url?.raw || ''

        const headers: KeyValuePair[] = (item.request.header || []).map((h) => ({
          key: h.key,
          value: h.value,
          enabled: true
        }))

        let bodyMode: BodyMode = BodyMode.None
        let rawContent = ''
        let formItems: KeyValuePair[] = []
        let urlEncodedItems: KeyValuePair[] = []

        if (item.request.body) {
          switch (item.request.body.mode) {
            case 'raw':
              bodyMode = BodyMode.Raw
              rawContent = item.request.body.raw || ''
              break
            case 'formdata':
              bodyMode = BodyMode.FormData
              formItems = (item.request.body.formdata || []).map((f) => ({
                key: f.key,
                value: f.value || '',
                type: f.type === 'file' ? ItemType.File : ItemType.Text,
                enabled: true
              }))
              break
            case 'urlencoded':
              bodyMode = BodyMode.UrlEncoded
              urlEncodedItems = (item.request.body.urlencoded || []).map((u) => ({
                key: u.key,
                value: u.value || '',
                enabled: true
              }))
              break
          }
        }

        const req: RequestModel = {
          id: uuidv4(),
          name: item.name,
          method: (item.request.method?.toUpperCase() as HTTPMethod) || HTTPMethod.GET,
          url,
          headers,
          body: {
            mode: bodyMode,
            rawContent,
            formItems,
            urlEncodedItems
          },
          auth: { type: AuthType.None },
          starred: false,
          sort: requests.length,
          deleted: false,
          createTime: now,
          updateTime: now,
          collectionId: collection.id,
          folderId: parentFolderId || undefined
        }
        requests.push(req)
      }
    }
  }

  processItems(data.item || [])
  return { collections: [collection], folders, requests }
}

/**
 * Parse an OpenAPI 3.x or Swagger 2.0 spec.
 */
export function parseOpenAPISpec(json: string): ImportResult {
  const data = JSON.parse(json)
  const now = new Date().toISOString()
  const isOpenAPI3 = data.openapi !== undefined
  const isSwagger2 = data.swagger === '2.0'
  if (!isOpenAPI3 && !isSwagger2) {
    return { collections: [], folders: [], requests: [] }
  }

  const specName = data.info?.title || 'Imported API Spec'

  const collection: Collection = {
    id: uuidv4(),
    name: specName,
    description: data.info?.description || '',
    starred: false,
    sort: 0,
    deleted: false,
    createTime: now,
    updateTime: now
  }

  const folders: CollectionFolder[] = []
  const requests: RequestModel[] = []

  const paths = data.paths || {}
  const baseUrl = isOpenAPI3
    ? data.servers?.[0]?.url || ''
    : data.host
      ? `${data.schemes?.[0] || 'https'}://${data.host}${data.basePath || ''}`
      : ''

  for (const [path, methods] of Object.entries(paths)) {
    if (!methods || typeof methods !== 'object') continue

    // Create folder for path group
    const folder: CollectionFolder = {
      id: uuidv4(),
      collectionId: collection.id,
      parentId: null,
      name: path,
      sort: folders.length,
      deleted: false,
      createTime: now,
      updateTime: now
    }
    folders.push(folder)

    for (const [method, operation] of Object.entries(
      methods as Record<string, Record<string, unknown>>
    )) {
      const upperMethod = method.toUpperCase()
      if (!['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS'].includes(upperMethod))
        continue

      const params: KeyValuePair[] = []
      const opParams = (operation.parameters as Record<string, unknown>[]) || []
      for (const p of opParams) {
        if (p.in === 'query') {
          params.push({
            key: (p.name as string) || '',
            value: '',
            description: (p.description as string) || '',
            enabled: !p.required
          })
        }
      }

      const req: RequestModel = {
        id: uuidv4(),
        name:
          (operation.summary as string) ||
          (operation.operationId as string) ||
          `${upperMethod} ${path}`,
        method: upperMethod as HTTPMethod,
        url: `${baseUrl}${path}`,
        params,
        headers: [],
        auth: { type: AuthType.None },
        starred: false,
        sort: requests.length,
        deleted: false,
        createTime: now,
        updateTime: now,
        collectionId: collection.id,
        folderId: folder.id
      }
      requests.push(req)
    }
  }

  return { collections: [collection], folders, requests }
}
