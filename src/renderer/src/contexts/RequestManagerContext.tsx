/**
 * RequestManagerProvider — global state container for the Pigeon app.
 *
 * Manages collections, history, environments, config, and tab coordination.
 * All persistent state syncs to SQLite via the preload IPC bridge.
 */

import React, { useEffect, useRef, useState, useCallback } from 'react'
import type {
  RequestModel,
  Collection,
  CollectionFolder,
  Environment,
  RequestHistoryRecord,
  SystemConfig
} from '@shared/types'
import {
  RequestManagerContext,
  RequestManagerContextValue,
  OpenRequestHandler
} from './useRequestManager'

export const RequestManagerProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [collections, setCollections] = useState<Collection[]>([])
  const [history, setHistory] = useState<RequestHistoryRecord[]>([])
  const [environments, setEnvironments] = useState<Environment[]>([])
  const [activeEnvironmentId, setActiveEnvironmentId] = useState<string | null>(null)
  const [variableMap, setVariableMap] = useState<Record<string, string>>({})
  const [config, setConfig] = useState<SystemConfig | null>(null)

  const openHandler = useRef<OpenRequestHandler | null>(null)
  const closeHandler = useRef<(() => void) | null>(null)
  const hydrated = useRef(false)

  // Initial hydration
  useEffect(() => {
    async function hydrate(): Promise<void> {
      try {
        const [configRes, collRes, envRes, histRes, varRes] = await Promise.all([
          window.api?.getConfig(),
          window.api?.listCollections(),
          window.api?.listEnvironments(),
          window.api?.listHistory(),
          window.api?.resolveVariables()
        ])

        if (configRes?.ok && configRes.data) setConfig(configRes.data)
        if (collRes?.ok && collRes.data) setCollections(collRes.data)
        if (envRes?.ok && envRes.data) {
          setEnvironments(envRes.data)
          const active = envRes.data.find((e) => e.isActive)
          if (active) setActiveEnvironmentId(active.id)
        }
        if (histRes?.ok && histRes.data) setHistory(histRes.data)
        if (varRes?.ok && varRes.data) setVariableMap(varRes.data)
      } catch (err) {
        console.error('[RequestManager] Hydration failed:', err)
      } finally {
        hydrated.current = true
      }
    }
    void hydrate()
  }, [])

  // Persist config changes
  useEffect(() => {
    if (!hydrated.current || !config) return
    window.api
      ?.saveConfig(config)
      .catch((err) => console.error('[RequestManager] Save config failed:', err))
  }, [config])

  const setActiveEnvironment = useCallback(async (id: string) => {
    setActiveEnvironmentId(id)
    try {
      await window.api?.activateEnvironment(id)
      const varRes = await window.api?.resolveVariables()
      if (varRes?.ok && varRes.data) setVariableMap(varRes.data)
    } catch (err) {
      console.error('[RequestManager] Activate env failed:', err)
    }
  }, [])

  const openRequest: OpenRequestHandler = useCallback((req, options) => {
    openHandler.current?.(req, options)
  }, [])

  const registerOpenHandler = useCallback((handler: OpenRequestHandler | null) => {
    openHandler.current = handler
  }, [])

  const closeCurrentTab = useCallback(() => {
    closeHandler.current?.()
  }, [])

  const registerCloseHandler = useCallback((handler: (() => void) | null) => {
    closeHandler.current = handler
  }, [])

  const addFolder = useCallback(
    async (title: string, collectionId: string, parentId?: string | null) => {
      try {
        const res = await window.api?.createFolder(collectionId, title, parentId)
        if (res?.ok && res.data) {
          const folder = res.data as CollectionFolder
          setCollections((prev) =>
            prev.map((c) =>
              c.id === collectionId ? { ...c, folders: [...(c.folders || []), folder] } : c
            )
          )
        }
      } catch (err) {
        console.error('[RequestManager] Add folder failed:', err)
      }
    },
    []
  )

  const addRequestToCollection = useCallback(
    async (request: RequestModel, collectionId: string, folderId?: string | null) => {
      try {
        const res = await window.api?.createRequest({
          ...request,
          collectionId,
          folderId: folderId || undefined
        })
        if (res?.ok && res.data) {
          const newReq = res.data as RequestModel
          setCollections((prev) =>
            prev.map((c) =>
              c.id === collectionId ? { ...c, requests: [...(c.requests || []), newReq] } : c
            )
          )
        }
      } catch (err) {
        console.error('[RequestManager] Add request failed:', err)
      }
    },
    []
  )

  const removeCollectionNode = useCallback(async (id: string) => {
    try {
      await window.api?.deleteCollection(id).catch(() => {})
      await window.api?.deleteFolder(id).catch(() => {})
      await window.api?.deleteRequest(id).catch(() => {})
      const res = await window.api?.listCollections()
      if (res?.ok && res.data) setCollections(res.data)
    } catch (err) {
      console.error('[RequestManager] Remove node failed:', err)
    }
  }, [])

  const renameCollectionNode = useCallback(async (id: string, newName: string) => {
    try {
      await window.api?.updateCollection(id, { name: newName }).catch(() => {})
      await window.api?.updateFolder(id, { name: newName }).catch(() => {})
      await window.api?.updateRequest(id, { name: newName }).catch(() => {})
      const res = await window.api?.listCollections()
      if (res?.ok && res.data) setCollections(res.data)
    } catch (err) {
      console.error('[RequestManager] Rename node failed:', err)
    }
  }, [])

  const exportCollectionNode = useCallback(async (id: string) => {
    try {
      const res = await window.api?.exportCollection(id)
      if (res?.ok && res.data) {
        const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `collection-${id}.json`
        document.body.appendChild(a)
        a.click()
        a.remove()
        URL.revokeObjectURL(url)
      }
    } catch (err) {
      console.error('[RequestManager] Export node failed:', err)
    }
  }, [])

  const searchCollections = useCallback(async (keyword: string) => {
    try {
      const res = await window.api?.globalSearch(keyword)
      if (res?.ok && res.data) {
        const data = res.data as { collections: Collection[] }
        if (data.collections) setCollections(data.collections)
      }
    } catch (err) {
      console.error('[RequestManager] Search collections failed:', err)
    }
  }, [])

  const addHistory = useCallback(async (record: Partial<RequestHistoryRecord>) => {
    try {
      const res = await window.api?.saveHistory(record)
      if (res?.ok && res.data) {
        setHistory((prev) => [res.data as RequestHistoryRecord, ...prev])
      }
    } catch (err) {
      console.error('[RequestManager] Add history failed:', err)
    }
  }, [])

  const clearHistoryFn = useCallback(async () => {
    try {
      await window.api?.clearHistory()
      setHistory([])
    } catch (err) {
      console.error('[RequestManager] Clear history failed:', err)
    }
  }, [])

  const searchHistoryFn = useCallback(async (keyword: string) => {
    try {
      const res = await window.api?.searchHistory(keyword)
      if (res?.ok && res.data) setHistory(res.data)
    } catch (err) {
      console.error('[RequestManager] Search history failed:', err)
    }
  }, [])

  const value: RequestManagerContextValue = {
    collections,
    folders: new Map(),
    setCollections,
    history,
    setHistory,
    environments,
    activeEnvironmentId,
    setEnvironments,
    setActiveEnvironment,
    variableMap,
    config,
    setConfig,
    openRequest,
    closeCurrentTab,
    registerOpenHandler,
    registerCloseHandler,
    addFolder,
    addRequestToCollection,
    removeCollectionNode,
    renameCollectionNode,
    exportCollectionNode,
    searchCollections,
    addHistory,
    clearHistory: clearHistoryFn,
    searchHistory: searchHistoryFn
  }

  return <RequestManagerContext.Provider value={value}>{children}</RequestManagerContext.Provider>
}
