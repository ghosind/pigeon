import { createContext, useContext } from 'react'
import { Request, RequestHistory, CollectionNode } from '@shared/types'

export type OpenHandler = (req: Request, options?: { newTab?: boolean }) => void

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
  openRequest: (req: Request) => void
  registerOpenHandler: (h: OpenHandler | null) => void
}

const RequestManagerContext = createContext<RequestManagerContextValue | null>(null)

export function useRequestManager(): RequestManagerContextValue {
  const ctx = useContext(RequestManagerContext)
  if (!ctx) throw new Error('useRequestManager must be used within RequestManagerProvider')
  return ctx
}

export { RequestManagerContext }
