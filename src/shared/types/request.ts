// =========================================================================
// RequestModel — tab-level request entity, persisted in http_request table
// =========================================================================

import type { HTTPMethod } from './enums'
import type { HTTPAuthorization, HTTPBody, HTTPResponse, HTTPSettings, KeyValuePair } from './http'

export interface RequestModel {
  id: string
  name: string
  description?: string
  method: HTTPMethod
  url: string
  auth?: HTTPAuthorization
  headers?: KeyValuePair[]
  params?: KeyValuePair[]
  body?: HTTPBody
  settings?: HTTPSettings
  response?: HTTPResponse
  collectionId?: string
  folderId?: string
  starred: boolean
  sort: number
  deleted: boolean
  createTime: string
  updateTime: string
}
