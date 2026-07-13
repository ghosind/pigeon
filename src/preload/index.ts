/**
 * Preload script — exposes typed IPC API to the renderer process.
 *
 * All IPC communication goes through this bridge. The renderer never
 * directly accesses Node.js or Electron APIs.
 */

import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import * as channels from '@shared/constants/channels'
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

// ---------------------------------------------------------------------------
// API shape
// ---------------------------------------------------------------------------

const api = {
  // -- Network -------------------------------------------------------------
  sendRequest: (id: string, req: HTTPRequestConfig): Promise<HTTPResponse> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_SEND, id, req),

  abortRequest: (id: string): Promise<void> => ipcRenderer.invoke(channels.IPC_REQUEST_ABORT, id),

  // -- Dialog --------------------------------------------------------------
  openFileDialog: (): Promise<string | null> => ipcRenderer.invoke(channels.IPC_DIALOG_OPEN_FILE),

  // -- System Config -------------------------------------------------------
  getConfig: (): Promise<{ ok: boolean; data?: SystemConfig; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_CONFIG_GET),

  saveConfig: (
    partial: Partial<SystemConfig>
  ): Promise<{ ok: boolean; data?: SystemConfig; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_CONFIG_SAVE, partial),

  // -- Collections ---------------------------------------------------------
  listCollections: (
    workspaceId?: string
  ): Promise<{ ok: boolean; data?: Collection[]; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_COLLECTION_LIST, workspaceId),

  getCollection: (id: string): Promise<{ ok: boolean; data?: Collection; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_COLLECTION_GET, id),

  createCollection: (
    name: string,
    description?: string,
    workspaceId?: string
  ): Promise<{ ok: boolean; data?: Collection; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_COLLECTION_CREATE, name, description, workspaceId),

  updateCollection: (
    id: string,
    data: Partial<Collection>
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_COLLECTION_UPDATE, id, data),

  deleteCollection: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_COLLECTION_DELETE, id),

  exportCollection: (id: string): Promise<{ ok: boolean; data?: unknown; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_COLLECTION_EXPORT, id),

  // -- Folders -------------------------------------------------------------
  createFolder: (
    collectionId: string,
    name: string,
    parentId?: string | null
  ): Promise<{ ok: boolean; data?: CollectionFolder; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_FOLDER_CREATE, collectionId, name, parentId),

  updateFolder: (
    id: string,
    data: Partial<CollectionFolder>
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_FOLDER_UPDATE, id, data),

  deleteFolder: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_FOLDER_DELETE, id),

  // -- Requests ------------------------------------------------------------
  getRequest: (id: string): Promise<{ ok: boolean; data?: RequestModel; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_GET, id),

  createRequest: (
    data: Partial<RequestModel>
  ): Promise<{ ok: boolean; data?: RequestModel; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_CREATE, data),

  updateRequest: (
    id: string,
    data: Partial<RequestModel>
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_UPDATE, id, data),

  deleteRequest: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_DELETE, id),

  duplicateRequest: (id: string): Promise<{ ok: boolean; data?: RequestModel; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_DUPLICATE, id),

  // -- Request Params / Headers --------------------------------------------
  batchSaveParams: (
    requestId: string,
    items: KeyValuePair[]
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_PARAM_BATCH_SAVE, requestId, items),

  batchSaveHeaders: (
    requestId: string,
    items: KeyValuePair[]
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_HEADER_BATCH_SAVE, requestId, items),

  // -- Request Body / Auth / Settings --------------------------------------
  saveBody: (requestId: string, body: unknown): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_BODY_SAVE, requestId, body),

  getBody: (requestId: string): Promise<{ ok: boolean; data?: unknown; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_BODY_GET, requestId),

  saveAuth: (requestId: string, auth: unknown): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_AUTH_SAVE, requestId, auth),

  getAuth: (requestId: string): Promise<{ ok: boolean; data?: unknown; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_AUTH_GET, requestId),

  saveRequestSetting: (
    requestId: string,
    settings: unknown
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_SETTING_SAVE, requestId, settings),

  getRequestSetting: (
    requestId: string
  ): Promise<{ ok: boolean; data?: unknown; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_REQUEST_SETTING_GET, requestId),

  // -- Environments --------------------------------------------------------
  listEnvironments: (): Promise<{ ok: boolean; data?: Environment[]; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_ENV_LIST),

  getEnvironment: (id: string): Promise<{ ok: boolean; data?: Environment; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_ENV_GET, id),

  createEnvironment: (
    name: string,
    isGlobal?: boolean
  ): Promise<{ ok: boolean; data?: Environment; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_ENV_CREATE, name, isGlobal),

  updateEnvironment: (
    id: string,
    data: Partial<Environment>
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_ENV_UPDATE, id, data),

  deleteEnvironment: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_ENV_DELETE, id),

  duplicateEnvironment: (
    sourceId: string,
    newName: string
  ): Promise<{ ok: boolean; data?: Environment; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_ENV_DUPLICATE, sourceId, newName),

  activateEnvironment: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_ENV_ACTIVATE, id),

  // -- Environment Variables -----------------------------------------------
  listEnvVariables: (
    envId: string
  ): Promise<{ ok: boolean; data?: EnvironmentVariable[]; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_ENV_VAR_LIST, envId),

  batchSaveEnvVariables: (
    envId: string,
    variables: Partial<EnvironmentVariable>[]
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_ENV_VAR_BATCH_SAVE, envId, variables),

  deleteEnvVariable: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_ENV_VAR_DELETE, id),

  // -- Variable Resolution -------------------------------------------------
  resolveVariables: (): Promise<{ ok: boolean; data?: Record<string, string>; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_VAR_RESOLVE),

  // -- History -------------------------------------------------------------
  listHistory: (
    limit?: number,
    offset?: number,
    workspaceId?: string
  ): Promise<{ ok: boolean; data?: RequestHistoryRecord[]; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_HISTORY_LIST, limit, offset, workspaceId),

  saveHistory: (
    record: Partial<RequestHistoryRecord>
  ): Promise<{ ok: boolean; data?: RequestHistoryRecord; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_HISTORY_SAVE, record),

  deleteHistory: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_HISTORY_DELETE, id),

  clearHistory: (): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_HISTORY_CLEAR),

  searchHistory: (
    keyword: string,
    limit?: number
  ): Promise<{ ok: boolean; data?: RequestHistoryRecord[]; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_HISTORY_SEARCH, keyword, limit),

  // -- Test Scripts --------------------------------------------------------
  saveTestScript: (
    requestId: string,
    scriptContent: string
  ): Promise<{ ok: boolean; data?: TestScript; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_TEST_SCRIPT_SAVE, requestId, scriptContent),

  getTestScript: (requestId: string): Promise<{ ok: boolean; data?: TestScript; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_TEST_SCRIPT_GET, requestId),

  deleteTestScript: (requestId: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_TEST_SCRIPT_DELETE, requestId),

  // -- Cookies -------------------------------------------------------------
  listCookies: (domain?: string): Promise<{ ok: boolean; data?: CookieInfo[]; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_COOKIE_LIST, domain),

  saveCookie: (cookie: CookieInfo): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_COOKIE_SAVE, cookie),

  deleteCookie: (
    domain: string,
    name: string,
    path?: string
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_COOKIE_DELETE, domain, name, path),

  clearCookies: (domain?: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_COOKIE_CLEAR, domain),

  // -- Search --------------------------------------------------------------
  globalSearch: (
    keyword: string,
    limit?: number
  ): Promise<{ ok: boolean; data?: unknown; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_SEARCH_GLOBAL, keyword, limit),

  // -- Workspaces ----------------------------------------------------------
  listWorkspaces: (): Promise<{
    ok: boolean
    data?: import('@shared/types').Workspace[]
    error?: string
  }> => ipcRenderer.invoke(channels.IPC_WORKSPACE_LIST),

  getWorkspace: (
    id: string
  ): Promise<{ ok: boolean; data?: import('@shared/types').Workspace; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_WORKSPACE_GET, id),

  createWorkspace: (
    name: string,
    description?: string
  ): Promise<{ ok: boolean; data?: import('@shared/types').Workspace; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_WORKSPACE_CREATE, name, description),

  updateWorkspace: (
    id: string,
    data: Partial<import('@shared/types').Workspace>
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_WORKSPACE_UPDATE, id, data),

  deleteWorkspace: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_WORKSPACE_DELETE, id),

  // -- Proxy Config --------------------------------------------------------
  listProxies: (): Promise<{
    ok: boolean
    data?: import('@shared/types').ProxyConfig[]
    error?: string
  }> => ipcRenderer.invoke(channels.IPC_PROXY_LIST),

  createProxy: (
    data: Partial<import('@shared/types').ProxyConfig>
  ): Promise<{ ok: boolean; data?: import('@shared/types').ProxyConfig; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_PROXY_CREATE, data),

  updateProxy: (
    id: string,
    data: Partial<import('@shared/types').ProxyConfig>
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_PROXY_UPDATE, id, data),

  deleteProxy: (id: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_PROXY_DELETE, id),

  // -- Global Variables ----------------------------------------------------
  listGlobalVars: (): Promise<{
    ok: boolean
    data?: import('@shared/types').GlobalVariable[]
    error?: string
  }> => ipcRenderer.invoke(channels.IPC_GLOBAL_VAR_LIST),

  saveGlobalVar: (
    key: string,
    value: string,
    description?: string
  ): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_GLOBAL_VAR_SAVE, key, value, description),

  deleteGlobalVar: (key: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_GLOBAL_VAR_DELETE, key),

  // -- Code Snippet --------------------------------------------------------
  generateCodeSnippet: (
    data: { method: string; url: string; headers?: Record<string, string>; body?: string },
    language: string
  ): Promise<{ ok: boolean; data?: string; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_CODE_SNIPPET_GENERATE, data, language),

  // -- Legacy compatibility (delegated to new channels) --------------------
  saveSettings: (settings: Record<string, string>): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_CONFIG_SAVE, settings),

  loadSettings: (): Promise<{ ok: boolean; result?: Record<string, string>; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_CONFIG_GET),

  loadCollections: (): Promise<{ ok: boolean; result?: unknown[]; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_COLLECTION_LIST),

  searchCollections: (
    keyword: string,
    limit?: number
  ): Promise<{ ok: boolean; result?: unknown; error?: string }> =>
    ipcRenderer.invoke(channels.IPC_SEARCH_GLOBAL, keyword, limit)
}

// ---------------------------------------------------------------------------
// Expose to renderer
// ---------------------------------------------------------------------------

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error('[Preload] Failed to expose API:', error)
  }
} else {
  // @ts-expect-error define in dts
  window.electron = electronAPI
  // @ts-expect-error define in dts
  window.api = api
}
