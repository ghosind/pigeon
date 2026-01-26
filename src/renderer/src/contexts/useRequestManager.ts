import { createContext, useContext } from 'react'
import { Request } from '@shared/types'

export type HistoryItem = {
  id: string
  request: Request
  timestamp: number
}

export type OpenHandler = (req: Request, options?: { newTab?: boolean }) => void

export type RequestManagerContextValue = {
  collections: Request[]
  history: HistoryItem[]
  addCollection: (c: Request) => void
  removeCollection: (id: string) => void
  addHistory: (req: Request) => void
  clearHistory: () => void
  openRequest: (req: Request, opts?: { newTab?: boolean }) => void
  registerOpenHandler: (h: OpenHandler | null) => void
}

const RequestManagerContext = createContext<RequestManagerContextValue | null>(null)

export function useRequestManager(): RequestManagerContextValue {
  const ctx = useContext(RequestManagerContext)
  if (!ctx) throw new Error('useRequestManager must be used within RequestManagerProvider')
  return ctx
}

export { RequestManagerContext }
