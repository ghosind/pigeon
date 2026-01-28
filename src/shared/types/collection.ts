import { Request } from './request'

export type CollectionRequest = {
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

export type CollectionNode = CollectionFolder | CollectionRequest

export interface Collections {
  nodes: CollectionNode[]
}
