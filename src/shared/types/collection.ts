import { Request } from './request'

export type CollectionItem = {
  id: string
  type: 'request'
  request: Request
}

export type CollectionFolder = {
  id: string
  type: 'folder'
  title: string
  children: CollectionNode[]
}

export type CollectionNode = CollectionFolder | CollectionItem

export interface Collections {
  nodes: CollectionNode[]
}
