// =========================================================================
// Collection tree — Collection, CollectionFolder entities
// =========================================================================

import type { RequestModel } from './request'

export interface CollectionFolder {
  id: string
  collectionId: string
  parentId: string | null
  name: string
  sort: number
  deleted: boolean
  createTime: string
  updateTime: string
  children?: CollectionFolder[]
  requests?: RequestModel[]
}

export interface Collection {
  id: string
  name: string
  description?: string
  starred: boolean
  sort: number
  deleted: boolean
  createTime: string
  updateTime: string
  folders?: CollectionFolder[]
  requests?: RequestModel[]
}
