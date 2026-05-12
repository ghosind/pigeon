import { createContext, useContext } from 'react'
import { Request, RequestHistory, CollectionNode } from '@shared/types'

export type OpenRequestOptions = {
  newTab?: boolean
  active?: boolean
}
export type OpenHandler = (req: Request, options?: OpenRequestOptions) => void
export type RequestManagerContextValue = {
  collections: CollectionNode[]
  history: RequestHistory[]
  addFolder: (title: string, parentId?: string | null) => void
  addRequestToFolder: (parentId: string | null, c: Request) => void
  removeNode: (id: string) => void
  renameNode: (id: string, newName: string) => void
  exportNode: (id: string) => void
  addHistory: (req: Request) => void
  clearHistory: () => void
  searchCollections: (keyword: string, limit?: number) => Promise<CollectionNode[]>
  searchHistory: (keyword: string, limit?: number) => Promise<RequestHistory[]>
  openRequest: (req: Request, options?: OpenRequestOptions) => void
  closeCurrent?: () => void
  registerOpenHandler: (h: OpenHandler | null) => void
  registerCollectionChangeHandler: (h: ((ids: string[]) => void) | null) => void
  registerCloseHandler?: (h: (() => void) | null) => void
}

const RequestManagerContext = createContext<RequestManagerContextValue | null>(null)

export function useRequestManager(): RequestManagerContextValue {
  const ctx = useContext(RequestManagerContext)
  if (!ctx) {
    throw new Error('useRequestManager must be used within RequestManagerProvider')
  }
  return ctx
}

export { RequestManagerContext }
