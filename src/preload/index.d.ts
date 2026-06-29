import { ElectronAPI } from '@electron-toolkit/preload'
import type {
  HTTPRequestConfig,
  HTTPResponse,
  SystemConfig,
  Collection,
  CollectionFolder,
  RequestModel,
  Environment,
  EnvironmentVariable,
  RequestHistoryRecord,
  TestScript,
  CookieInfo,
  KeyValuePair
} from '@shared/types'

interface PigeonAPI {
  // Network
  sendRequest: (id: string, req: HTTPRequestConfig) => Promise<HTTPResponse>
  abortRequest: (id: string) => Promise<void>
  // Dialog
  openFileDialog: () => Promise<string | null>
  // Config
  getConfig: () => Promise<{ ok: boolean; data?: SystemConfig; error?: string }>
  saveConfig: (
    partial: Partial<SystemConfig>
  ) => Promise<{ ok: boolean; data?: SystemConfig; error?: string }>
  // Collections
  listCollections: () => Promise<{ ok: boolean; data?: Collection[]; error?: string }>
  getCollection: (id: string) => Promise<{ ok: boolean; data?: Collection; error?: string }>
  createCollection: (
    name: string,
    description?: string
  ) => Promise<{ ok: boolean; data?: Collection; error?: string }>
  updateCollection: (
    id: string,
    data: Partial<Collection>
  ) => Promise<{ ok: boolean; error?: string }>
  deleteCollection: (id: string) => Promise<{ ok: boolean; error?: string }>
  exportCollection: (id: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>
  // Folders
  createFolder: (
    collectionId: string,
    name: string,
    parentId?: string | null
  ) => Promise<{ ok: boolean; data?: CollectionFolder; error?: string }>
  updateFolder: (
    id: string,
    data: Partial<CollectionFolder>
  ) => Promise<{ ok: boolean; error?: string }>
  deleteFolder: (id: string) => Promise<{ ok: boolean; error?: string }>
  // Requests
  getRequest: (id: string) => Promise<{ ok: boolean; data?: RequestModel; error?: string }>
  createRequest: (
    data: Partial<RequestModel>
  ) => Promise<{ ok: boolean; data?: RequestModel; error?: string }>
  updateRequest: (
    id: string,
    data: Partial<RequestModel>
  ) => Promise<{ ok: boolean; error?: string }>
  deleteRequest: (id: string) => Promise<{ ok: boolean; error?: string }>
  duplicateRequest: (id: string) => Promise<{ ok: boolean; data?: RequestModel; error?: string }>
  // Params/Headers
  batchSaveParams: (
    requestId: string,
    items: KeyValuePair[]
  ) => Promise<{ ok: boolean; error?: string }>
  batchSaveHeaders: (
    requestId: string,
    items: KeyValuePair[]
  ) => Promise<{ ok: boolean; error?: string }>
  // Body/Auth/Settings
  saveBody: (requestId: string, body: unknown) => Promise<{ ok: boolean; error?: string }>
  getBody: (requestId: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>
  saveAuth: (requestId: string, auth: unknown) => Promise<{ ok: boolean; error?: string }>
  getAuth: (requestId: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>
  saveRequestSetting: (
    requestId: string,
    settings: unknown
  ) => Promise<{ ok: boolean; error?: string }>
  getRequestSetting: (requestId: string) => Promise<{ ok: boolean; data?: unknown; error?: string }>
  // Environments
  listEnvironments: () => Promise<{ ok: boolean; data?: Environment[]; error?: string }>
  getEnvironment: (id: string) => Promise<{ ok: boolean; data?: Environment; error?: string }>
  createEnvironment: (
    name: string,
    isGlobal?: boolean
  ) => Promise<{ ok: boolean; data?: Environment; error?: string }>
  updateEnvironment: (
    id: string,
    data: Partial<Environment>
  ) => Promise<{ ok: boolean; error?: string }>
  deleteEnvironment: (id: string) => Promise<{ ok: boolean; error?: string }>
  duplicateEnvironment: (
    sourceId: string,
    newName: string
  ) => Promise<{ ok: boolean; data?: Environment; error?: string }>
  activateEnvironment: (id: string) => Promise<{ ok: boolean; error?: string }>
  // Env Variables
  listEnvVariables: (
    envId: string
  ) => Promise<{ ok: boolean; data?: EnvironmentVariable[]; error?: string }>
  batchSaveEnvVariables: (
    envId: string,
    variables: Partial<EnvironmentVariable>[]
  ) => Promise<{ ok: boolean; error?: string }>
  deleteEnvVariable: (id: string) => Promise<{ ok: boolean; error?: string }>
  // Variable Resolution
  resolveVariables: () => Promise<{ ok: boolean; data?: Record<string, string>; error?: string }>
  // History
  listHistory: (
    limit?: number,
    offset?: number
  ) => Promise<{ ok: boolean; data?: RequestHistoryRecord[]; error?: string }>
  saveHistory: (
    record: Partial<RequestHistoryRecord>
  ) => Promise<{ ok: boolean; data?: RequestHistoryRecord; error?: string }>
  deleteHistory: (id: string) => Promise<{ ok: boolean; error?: string }>
  clearHistory: () => Promise<{ ok: boolean; error?: string }>
  searchHistory: (
    keyword: string,
    limit?: number
  ) => Promise<{ ok: boolean; data?: RequestHistoryRecord[]; error?: string }>
  // Test Scripts
  saveTestScript: (
    requestId: string,
    scriptContent: string
  ) => Promise<{ ok: boolean; data?: TestScript; error?: string }>
  getTestScript: (requestId: string) => Promise<{ ok: boolean; data?: TestScript; error?: string }>
  deleteTestScript: (requestId: string) => Promise<{ ok: boolean; error?: string }>
  // Cookies
  listCookies: (domain?: string) => Promise<{ ok: boolean; data?: CookieInfo[]; error?: string }>
  saveCookie: (cookie: CookieInfo) => Promise<{ ok: boolean; error?: string }>
  deleteCookie: (
    domain: string,
    name: string,
    path?: string
  ) => Promise<{ ok: boolean; error?: string }>
  clearCookies: (domain?: string) => Promise<{ ok: boolean; error?: string }>
  // Search
  globalSearch: (
    keyword: string,
    limit?: number
  ) => Promise<{ ok: boolean; data?: unknown; error?: string }>
  // Tabs
  saveTabs: (tabs: unknown[]) => Promise<{ ok: boolean; error?: string }>
  loadTabs: () => Promise<{ ok: boolean; data?: unknown[]; error?: string }>
  // Legacy
  saveSettings: (settings: Record<string, string>) => Promise<{ ok: boolean; error?: string }>
  loadSettings: () => Promise<{ ok: boolean; result?: Record<string, string>; error?: string }>
  saveCollections: (collections: unknown[]) => Promise<{ ok: boolean; error?: string }>
  loadCollections: () => Promise<{ ok: boolean; result?: unknown[]; error?: string }>
  searchCollections: (
    keyword: string,
    limit?: number
  ) => Promise<{ ok: boolean; result?: unknown; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: PigeonAPI
  }
}
