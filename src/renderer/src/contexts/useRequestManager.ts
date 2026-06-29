/**
 * Request manager context — provides app-wide state for collections,
 * history, environments, tabs, and global configuration.
 */

import { createContext, useContext } from 'react'
import type {
  RequestModel,
  Collection,
  CollectionFolder,
  Environment,
  RequestHistoryRecord,
  SystemConfig
} from '@shared/types'

export interface OpenTabOptions {
  newTab?: boolean
  active?: boolean
}

export type OpenRequestHandler = (req: RequestModel, options?: OpenTabOptions) => void

export interface RequestManagerContextValue {
  // Collections
  collections: Collection[]
  folders: Map<string, CollectionFolder[]>
  setCollections: (collections: Collection[]) => void

  // History
  history: RequestHistoryRecord[]
  setHistory: (history: RequestHistoryRecord[]) => void

  // Environments
  environments: Environment[]
  activeEnvironmentId: string | null
  setEnvironments: (envs: Environment[]) => void
  setActiveEnvironment: (id: string) => void
  variableMap: Record<string, string>

  // Config
  config: SystemConfig | null
  setConfig: (config: SystemConfig) => void

  // Tabs / Request management
  openRequest: OpenRequestHandler
  closeCurrentTab: (() => void) | null
  registerOpenHandler: (handler: OpenRequestHandler | null) => void
  registerCloseHandler: (handler: (() => void) | null) => void

  // Collection tree operations
  addFolder: (title: string, collectionId: string, parentId?: string | null) => void
  addRequestToCollection: (
    request: RequestModel,
    collectionId: string,
    folderId?: string | null
  ) => void
  removeCollectionNode: (id: string) => void
  renameCollectionNode: (id: string, newName: string) => void
  exportCollectionNode: (id: string) => void
  searchCollections: (keyword: string) => Promise<void>

  // History operations
  addHistory: (record: Partial<RequestHistoryRecord>) => void
  clearHistory: () => void
  searchHistory: (keyword: string) => Promise<void>
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
