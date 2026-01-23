import { createContext, useContext } from 'react'
import { HTTPRequest } from '@shared/types'

export type CollectionItem = {
  id: string
  name: string
  request: HTTPRequest
}

export type HistoryItem = {
  id: string
  request: HTTPRequest
  ts: number
}

export type OpenHandler = (req: HTTPRequest, options?: { newTab?: boolean }) => void

export type RequestManagerContextValue = {
  collections: CollectionItem[]
  history: HistoryItem[]
  addCollection: (c: CollectionItem) => void
  removeCollection: (id: string) => void
  addHistory: (req: HTTPRequest) => void
  clearHistory: () => void
  openRequest: (req: HTTPRequest, opts?: { newTab?: boolean }) => void
  registerOpenHandler: (h: OpenHandler | null) => void
}

const RequestManagerContext = createContext<RequestManagerContextValue | null>(null)

export function useRequestManager(): RequestManagerContextValue {
  const ctx = useContext(RequestManagerContext)
  if (!ctx) throw new Error('useRequestManager must be used within RequestManagerProvider')
  return ctx
}

export { RequestManagerContext }
