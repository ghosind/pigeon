/**
 * Database IPC handlers — bridges renderer API calls to repository layer.
 *
 * Each handler validates input, delegates to the appropriate repository,
 * and returns a consistent { ok, data } or { ok, error } response.
 */

import { IpcMain } from 'electron'
import * as channels from '@shared/constants/channels'
import {
  systemConfigRepo,
  environmentRepo,
  collectionRepo,
  historyRepo,
  cookieRepo
} from '../../db/repositories'
import type { ThemeMode } from '@shared/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ok<T>(data: T): { ok: true; data: T } {
  return { ok: true, data }
}

function fail(error: string): { ok: false; error: string } {
  return { ok: false, error }
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0
}

// ---------------------------------------------------------------------------
// Registration
// ---------------------------------------------------------------------------

export function registerDbHandlers(ipc: IpcMain): void {
  // -- System Config -------------------------------------------------------
  ipc.handle(channels.IPC_CONFIG_GET, async () => {
    try {
      const config = systemConfigRepo.getConfig()
      return ok(config)
    } catch (err) {
      console.error('[IPC] config:get — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_CONFIG_SAVE, async (_event, partial: Record<string, unknown>) => {
    try {
      if (!partial || typeof partial !== 'object') return fail('Invalid config data')
      const config = systemConfigRepo.saveConfig({
        theme: partial.theme as ThemeMode | undefined,
        timeout: partial.timeout as number | undefined,
        ignoreSSL: partial.ignoreSSL as boolean | undefined,
        enableProxy: partial.enableProxy as boolean | undefined,
        proxyUrl: partial.proxyUrl as string | undefined,
        historyRetention: partial.historyRetention as number | undefined,
        layoutSplitPercent: partial.layoutSplitPercent as number | undefined
      })
      return ok(config)
    } catch (err) {
      console.error('[IPC] config:save — failed:', err)
      return fail((err as Error).message)
    }
  })

  // -- Collections ---------------------------------------------------------
  ipc.handle(channels.IPC_COLLECTION_LIST, async () => {
    try {
      return ok(collectionRepo.listCollections())
    } catch (err) {
      console.error('[IPC] collection:list — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_COLLECTION_GET, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid collection ID')
      const col = collectionRepo.getCollection(id)
      return col ? ok(col) : fail('Collection not found')
    } catch (err) {
      console.error('[IPC] collection:get — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_COLLECTION_CREATE, async (_event, name: string, description?: string) => {
    try {
      if (!isNonEmptyString(name)) return fail('Collection name is required')
      return ok(collectionRepo.createCollection(name, description || ''))
    } catch (err) {
      console.error('[IPC] collection:create — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(
    channels.IPC_COLLECTION_UPDATE,
    async (_event, id: string, data: Record<string, unknown>) => {
      try {
        if (!isNonEmptyString(id)) return fail('Invalid collection ID')
        return ok({
          updated: collectionRepo.updateCollection(
            id,
            data as Partial<{ name: string; description: string; starred: boolean; sort: number }>
          )
        })
      } catch (err) {
        console.error('[IPC] collection:update — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  ipc.handle(channels.IPC_COLLECTION_DELETE, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid collection ID')
      return ok({ deleted: collectionRepo.deleteCollection(id) })
    } catch (err) {
      console.error('[IPC] collection:delete — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_COLLECTION_EXPORT, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid collection ID')
      const col = collectionRepo.getCollection(id)
      if (!col) return fail('Collection not found')
      const folders = collectionRepo.listFolders(id)
      const requests = collectionRepo.listRequests(id)
      const full = requests.map((r) => collectionRepo.getFullRequest(r.id)).filter(Boolean)
      return ok({ collection: col, folders, requests: full })
    } catch (err) {
      console.error('[IPC] collection:export — failed:', err)
      return fail((err as Error).message)
    }
  })

  // -- Folders -------------------------------------------------------------
  ipc.handle(
    channels.IPC_FOLDER_CREATE,
    async (_event, collectionId: string, name: string, parentId?: string | null) => {
      try {
        if (!isNonEmptyString(collectionId) || !isNonEmptyString(name))
          return fail('Invalid folder data')
        return ok(collectionRepo.createFolder(collectionId, name, parentId || null))
      } catch (err) {
        console.error('[IPC] folder:create — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  ipc.handle(
    channels.IPC_FOLDER_UPDATE,
    async (_event, id: string, data: Record<string, unknown>) => {
      try {
        if (!isNonEmptyString(id)) return fail('Invalid folder ID')
        return ok({
          updated: collectionRepo.updateFolder(
            id,
            data as Partial<{ name: string; parentId: string | null; sort: number }>
          )
        })
      } catch (err) {
        console.error('[IPC] folder:update — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  ipc.handle(channels.IPC_FOLDER_DELETE, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid folder ID')
      return ok({ deleted: collectionRepo.deleteFolder(id) })
    } catch (err) {
      console.error('[IPC] folder:delete — failed:', err)
      return fail((err as Error).message)
    }
  })

  // -- Requests ------------------------------------------------------------
  ipc.handle(channels.IPC_REQUEST_GET, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid request ID')
      const req = collectionRepo.getFullRequest(id)
      return req ? ok(req) : fail('Request not found')
    } catch (err) {
      console.error('[IPC] request:get — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_REQUEST_CREATE, async (_event, data: Record<string, unknown>) => {
    try {
      return ok(
        collectionRepo.createRequest(
          data as unknown as Parameters<typeof collectionRepo.createRequest>[0]
        )
      )
    } catch (err) {
      console.error('[IPC] request:create — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(
    channels.IPC_REQUEST_UPDATE,
    async (_event, id: string, data: Record<string, unknown>) => {
      try {
        if (!isNonEmptyString(id)) return fail('Invalid request ID')
        return ok({
          updated: collectionRepo.updateRequest(
            id,
            data as unknown as Parameters<typeof collectionRepo.updateRequest>[1]
          )
        })
      } catch (err) {
        console.error('[IPC] request:update — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  ipc.handle(channels.IPC_REQUEST_DELETE, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid request ID')
      return ok({ deleted: collectionRepo.deleteRequest(id) })
    } catch (err) {
      console.error('[IPC] request:delete — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_REQUEST_DUPLICATE, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid request ID')
      const dup = collectionRepo.duplicateRequest(id)
      return dup ? ok(dup) : fail('Request not found')
    } catch (err) {
      console.error('[IPC] request:duplicate — failed:', err)
      return fail((err as Error).message)
    }
  })

  // -- Request Params & Headers --------------------------------------------
  ipc.handle(
    channels.IPC_REQUEST_PARAM_BATCH_SAVE,
    async (_event, requestId: string, items: unknown[]) => {
      try {
        if (!isNonEmptyString(requestId)) return fail('Invalid request ID')
        if (!Array.isArray(items)) return fail('Items must be an array')
        collectionRepo.batchSaveParams(
          requestId,
          items as Parameters<typeof collectionRepo.batchSaveParams>[1]
        )
        return ok({ saved: items.length })
      } catch (err) {
        console.error('[IPC] request:param:batch-save — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  ipc.handle(
    channels.IPC_REQUEST_HEADER_BATCH_SAVE,
    async (_event, requestId: string, items: unknown[]) => {
      try {
        if (!isNonEmptyString(requestId)) return fail('Invalid request ID')
        if (!Array.isArray(items)) return fail('Items must be an array')
        collectionRepo.batchSaveHeaders(
          requestId,
          items as Parameters<typeof collectionRepo.batchSaveHeaders>[1]
        )
        return ok({ saved: items.length })
      } catch (err) {
        console.error('[IPC] request:header:batch-save — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  // -- Request Body, Auth, Settings ----------------------------------------
  ipc.handle(
    channels.IPC_REQUEST_BODY_SAVE,
    async (_event, requestId: string, body: Record<string, unknown>) => {
      try {
        if (!isNonEmptyString(requestId)) return fail('Invalid request ID')
        collectionRepo.saveBody(
          requestId,
          body as unknown as Parameters<typeof collectionRepo.saveBody>[1]
        )
        return ok({ saved: true })
      } catch (err) {
        console.error('[IPC] request:body:save — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  ipc.handle(channels.IPC_REQUEST_BODY_GET, async (_event, requestId: string) => {
    try {
      if (!isNonEmptyString(requestId)) return fail('Invalid request ID')
      return ok(collectionRepo.getRequestBody(requestId) || null)
    } catch (err) {
      console.error('[IPC] request:body:get — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(
    channels.IPC_REQUEST_AUTH_SAVE,
    async (_event, requestId: string, auth: Record<string, unknown>) => {
      try {
        if (!isNonEmptyString(requestId)) return fail('Invalid request ID')
        collectionRepo.saveAuth(
          requestId,
          auth as unknown as Parameters<typeof collectionRepo.saveAuth>[1]
        )
        return ok({ saved: true })
      } catch (err) {
        console.error('[IPC] request:auth:save — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  ipc.handle(channels.IPC_REQUEST_AUTH_GET, async (_event, requestId: string) => {
    try {
      if (!isNonEmptyString(requestId)) return fail('Invalid request ID')
      return ok(collectionRepo.getRequestAuth(requestId) || null)
    } catch (err) {
      console.error('[IPC] request:auth:get — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(
    channels.IPC_REQUEST_SETTING_SAVE,
    async (_event, requestId: string, settings: Record<string, unknown>) => {
      try {
        if (!isNonEmptyString(requestId)) return fail('Invalid request ID')
        collectionRepo.saveSettings(
          requestId,
          settings as unknown as Parameters<typeof collectionRepo.saveSettings>[1]
        )
        return ok({ saved: true })
      } catch (err) {
        console.error('[IPC] request:setting:save — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  ipc.handle(channels.IPC_REQUEST_SETTING_GET, async (_event, requestId: string) => {
    try {
      if (!isNonEmptyString(requestId)) return fail('Invalid request ID')
      return ok(collectionRepo.getRequestSettings(requestId) || null)
    } catch (err) {
      console.error('[IPC] request:setting:get — failed:', err)
      return fail((err as Error).message)
    }
  })

  // -- Environments --------------------------------------------------------
  ipc.handle(channels.IPC_ENV_LIST, async () => {
    try {
      return ok(environmentRepo.listEnvironments())
    } catch (err) {
      console.error('[IPC] env:list — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_ENV_GET, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid environment ID')
      const env = environmentRepo.getEnvironment(id)
      return env ? ok(env) : fail('Environment not found')
    } catch (err) {
      console.error('[IPC] env:get — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_ENV_CREATE, async (_event, name: string, isGlobal?: boolean) => {
    try {
      if (!isNonEmptyString(name)) return fail('Environment name is required')
      return ok(environmentRepo.createEnvironment(name, Boolean(isGlobal)))
    } catch (err) {
      console.error('[IPC] env:create — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_ENV_UPDATE, async (_event, id: string, data: Record<string, unknown>) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid environment ID')
      return ok({
        updated: environmentRepo.updateEnvironment(
          id,
          data as Partial<{ name: string; isGlobal: boolean; isActive: boolean; sort: number }>
        )
      })
    } catch (err) {
      console.error('[IPC] env:update — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_ENV_DELETE, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid environment ID')
      return ok({ deleted: environmentRepo.deleteEnvironment(id) })
    } catch (err) {
      console.error('[IPC] env:delete — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_ENV_DUPLICATE, async (_event, sourceId: string, newName: string) => {
    try {
      if (!isNonEmptyString(sourceId) || !isNonEmptyString(newName))
        return fail('Invalid parameters')
      const dup = environmentRepo.duplicateEnvironment(sourceId, newName)
      return dup ? ok(dup) : fail('Source environment not found')
    } catch (err) {
      console.error('[IPC] env:duplicate — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_ENV_ACTIVATE, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid environment ID')
      environmentRepo.activateEnvironment(id)
      return ok({ activated: true })
    } catch (err) {
      console.error('[IPC] env:activate — failed:', err)
      return fail((err as Error).message)
    }
  })

  // -- Environment Variables -----------------------------------------------
  ipc.handle(channels.IPC_ENV_VAR_LIST, async (_event, envId: string) => {
    try {
      if (!isNonEmptyString(envId)) return fail('Invalid environment ID')
      return ok(environmentRepo.listVariables(envId))
    } catch (err) {
      console.error('[IPC] env:var:list — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(
    channels.IPC_ENV_VAR_BATCH_SAVE,
    async (_event, envId: string, variables: unknown[]) => {
      try {
        if (!isNonEmptyString(envId)) return fail('Invalid environment ID')
        if (!Array.isArray(variables)) return fail('Variables must be an array')
        environmentRepo.batchSaveVariables(
          envId,
          variables as Parameters<typeof environmentRepo.batchSaveVariables>[1]
        )
        return ok({ saved: variables.length })
      } catch (err) {
        console.error('[IPC] env:var:batch-save — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  ipc.handle(channels.IPC_ENV_VAR_DELETE, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid variable ID')
      return ok({ deleted: environmentRepo.deleteVariable(id) })
    } catch (err) {
      console.error('[IPC] env:var:delete — failed:', err)
      return fail((err as Error).message)
    }
  })

  // -- Variable Resolution -------------------------------------------------
  ipc.handle(channels.IPC_VAR_RESOLVE, async () => {
    try {
      return ok(environmentRepo.getVariableMap())
    } catch (err) {
      console.error('[IPC] var:resolve — failed:', err)
      return fail((err as Error).message)
    }
  })

  // -- History -------------------------------------------------------------
  ipc.handle(channels.IPC_HISTORY_LIST, async (_event, limit?: number, offset?: number) => {
    try {
      return ok(historyRepo.listHistory(limit || 200, offset || 0))
    } catch (err) {
      console.error('[IPC] history:list — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_HISTORY_SAVE, async (_event, record: Record<string, unknown>) => {
    try {
      return ok(historyRepo.saveHistory(record as Parameters<typeof historyRepo.saveHistory>[0]))
    } catch (err) {
      console.error('[IPC] history:save — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_HISTORY_DELETE, async (_event, id: string) => {
    try {
      if (!isNonEmptyString(id)) return fail('Invalid history ID')
      return ok({ deleted: historyRepo.deleteHistory(id) })
    } catch (err) {
      console.error('[IPC] history:delete — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_HISTORY_CLEAR, async () => {
    try {
      const count = historyRepo.clearHistory()
      console.log(`[IPC] history:clear — ${count} records cleared`)
      return ok({ cleared: count })
    } catch (err) {
      console.error('[IPC] history:clear — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_HISTORY_SEARCH, async (_event, keyword: string, limit?: number) => {
    try {
      if (!isNonEmptyString(keyword)) return fail('Search keyword is required')
      return ok(historyRepo.searchHistory(keyword, limit))
    } catch (err) {
      console.error('[IPC] history:search — failed:', err)
      return fail((err as Error).message)
    }
  })

  // -- Test Scripts --------------------------------------------------------
  ipc.handle(
    channels.IPC_TEST_SCRIPT_SAVE,
    async (_event, requestId: string, scriptContent: string) => {
      try {
        if (!isNonEmptyString(requestId)) return fail('Invalid request ID')
        return ok(collectionRepo.saveTestScript(requestId, scriptContent || ''))
      } catch (err) {
        console.error('[IPC] test-script:save — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  ipc.handle(channels.IPC_TEST_SCRIPT_GET, async (_event, requestId: string) => {
    try {
      if (!isNonEmptyString(requestId)) return fail('Invalid request ID')
      return ok(collectionRepo.getTestScript(requestId) || null)
    } catch (err) {
      console.error('[IPC] test-script:get — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_TEST_SCRIPT_DELETE, async (_event, requestId: string) => {
    try {
      if (!isNonEmptyString(requestId)) return fail('Invalid request ID')
      return ok({ deleted: collectionRepo.deleteTestScript(requestId) })
    } catch (err) {
      console.error('[IPC] test-script:delete — failed:', err)
      return fail((err as Error).message)
    }
  })

  // -- Cookies -------------------------------------------------------------
  ipc.handle(channels.IPC_COOKIE_LIST, async (_event, domain?: string) => {
    try {
      return ok(cookieRepo.listCookies(domain || undefined))
    } catch (err) {
      console.error('[IPC] cookie:list — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(channels.IPC_COOKIE_SAVE, async (_event, cookie: Record<string, unknown>) => {
    try {
      cookieRepo.saveCookie(cookie as unknown as Parameters<typeof cookieRepo.saveCookie>[0])
      return ok({ saved: true })
    } catch (err) {
      console.error('[IPC] cookie:save — failed:', err)
      return fail((err as Error).message)
    }
  })

  ipc.handle(
    channels.IPC_COOKIE_DELETE,
    async (_event, domain: string, name: string, path?: string) => {
      try {
        if (!isNonEmptyString(domain) || !isNonEmptyString(name))
          return fail('Invalid cookie identifier')
        return ok({ deleted: cookieRepo.deleteCookie(domain, name, path) })
      } catch (err) {
        console.error('[IPC] cookie:delete — failed:', err)
        return fail((err as Error).message)
      }
    }
  )

  ipc.handle(channels.IPC_COOKIE_CLEAR, async (_event, domain?: string) => {
    try {
      return ok({ cleared: cookieRepo.clearCookies(domain || undefined) })
    } catch (err) {
      console.error('[IPC] cookie:clear — failed:', err)
      return fail((err as Error).message)
    }
  })

  // -- Global Search -------------------------------------------------------
  ipc.handle(channels.IPC_SEARCH_GLOBAL, async (_event, keyword: string, limit?: number) => {
    try {
      if (!isNonEmptyString(keyword)) return fail('Search keyword is required')
      return ok(collectionRepo.searchAll(keyword, limit))
    } catch (err) {
      console.error('[IPC] search:global — failed:', err)
      return fail((err as Error).message)
    }
  })
}
