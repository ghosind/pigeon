/**
 * WorkspacePage — main API debugging workspace with multi-tab support.
 *
 * Layout: LeftSidebar | [TabBar | AddressBar | RequestPanel | Splitter | ResponsePanel] | RightSidebar
 *
 * Merged from RequestPage — per-tab response state, sending tracking,
 * cancel support, tab handler registration, and proper splitter.
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { Box, Paper } from '@mui/material'
import { v4 as uuidv4 } from 'uuid'
import TabBar from '@renderer/components/common/TabBar'
import AddressBar from '@renderer/components/request/AddressBar'
import RequestArea from '@renderer/components/request/RequestArea'
import ResponseArea from '@renderer/components/response/ResponseArea'
import Splitter from '@renderer/components/common/Splitter'
import Sidebar from '@renderer/components/common/Sidebar'
import ToolSideBar from '@renderer/components/common/ToolSideBar'
import { HTTPMethod, type RequestModel, type HTTPResponse } from '@shared/types'
import { useRequestManager } from '@renderer/contexts/useRequestManager'
import { RequestManagerProvider } from '@renderer/contexts/RequestManagerContext'
import { useI18n } from '@renderer/contexts/useI18n'
import { useCollectionStore, useHistoryStore } from '@renderer/stores'

function createEmptyRequest(
  i18nT: (key: string, params?: Record<string, string | number> | undefined) => string
): RequestModel {
  const now = new Date().toISOString()
  return {
    id: uuidv4(),
    name: i18nT('request.name.new'),
    method: HTTPMethod.GET,
    url: '',
    starred: false,
    sort: 0,
    deleted: false,
    createTime: now,
    updateTime: now
  }
}

function WorkspaceInner(): React.JSX.Element {
  const { id: workspaceId } = useParams<{ id: string }>()
  const requestManager = useRequestManager()
  const { t: i18nT } = useI18n()
  const hydrateCollections = useCollectionStore((s) => s.hydrate)
  const hydrateHistory = useHistoryStore((s) => s.hydrate)

  // Rehydrate collections & history when workspace changes
  useEffect(() => {
    if (workspaceId) {
      void hydrateCollections(workspaceId)
      void hydrateHistory(workspaceId)
    }
  }, [workspaceId, hydrateCollections, hydrateHistory])
  const [tabs, setTabs] = useState<RequestModel[]>(() => [createEmptyRequest(i18nT)])
  const [activeTabId, setActiveTabId] = useState<string>(tabs[0].id)
  const [splitPercent, setSplitPercent] = useState<number>(
    () => requestManager.config?.layoutSplitPercent ?? 40
  )
  const sendingRef = useRef<Set<string>>(new Set())
  const tabsRef = useRef<RequestModel[]>(tabs)
  const activeIdRef = useRef<string>(activeTabId)

  // Keep refs in sync
  React.useEffect(() => {
    tabsRef.current = tabs
  }, [tabs])
  React.useEffect(() => {
    activeIdRef.current = activeTabId
  }, [activeTabId])

  // Register tab open handler (called by sidebar collections/history)
  React.useEffect(() => {
    requestManager.registerOpenHandler((req, opts) => {
      const incoming = req.id ? req : { ...req, id: uuidv4() }
      setTabs((prev) => {
        if (!prev.some((t) => t.id === incoming.id)) {
          return [...prev, incoming]
        }
        return prev.map((t) => (t.id === incoming.id ? incoming : t))
      })
      if (opts?.active !== false) setActiveTabId(incoming.id)
    })
    return () => requestManager.registerOpenHandler(null)
  }, [requestManager])

  // Register close handler (Ctrl+W)
  React.useEffect(() => {
    requestManager.registerCloseHandler(() => {
      const id = activeIdRef.current
      setTabs((prev) => {
        if (prev.length <= 1) return prev
        const idx = prev.findIndex((t) => t.id === id)
        const filtered = prev.filter((t) => t.id !== id)
        const nextIdx = Math.min(idx, filtered.length - 1)
        setActiveTabId(filtered[nextIdx].id)
        return filtered
      })
    })
    return () => requestManager.registerCloseHandler(null)
  }, [requestManager])

  // Save layout split percent to config
  React.useEffect(() => {
    if (requestManager.config) {
      window.api?.saveConfig({ layoutSplitPercent: splitPercent }).catch(() => {})
    }
  }, [splitPercent, requestManager.config])

  // Tab operations
  const addTab = useCallback(() => {
    const newReq = createEmptyRequest(i18nT)
    newReq.name = i18nT('request.name.new')
    setTabs((prev) => [...prev, newReq])
    setActiveTabId(newReq.id)
  }, [i18nT])

  const closeTab = useCallback((id: string) => {
    setTabs((prev) => {
      if (prev.length <= 1) return prev
      const idx = prev.findIndex((t) => t.id === id)
      const filtered = prev.filter((t) => t.id !== id)
      if (activeIdRef.current === id) {
        const nextIdx = Math.min(idx, filtered.length - 1)
        setActiveTabId(filtered[nextIdx].id)
      }
      return filtered
    })
  }, [])

  const handleRename = useCallback((id: string, name: string) => {
    setTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, name, updateTime: new Date().toISOString() } : t))
    )
  }, [])

  const handleRequestChange = useCallback((updated: RequestModel) => {
    setTabs((prev) => prev.map((t) => (t.id === updated.id ? updated : t)))
  }, [])

  // Send request
  const handleSend = useCallback(async () => {
    const id = activeIdRef.current
    if (sendingRef.current.has(id)) return

    const request = tabsRef.current.find((t) => t.id === id)
    if (!request) return

    sendingRef.current.add(id)

    try {
      const resp: HTTPResponse = await window.api.sendRequest(id, {
        method: request.method,
        url: request.url,
        headers: request.headers,
        params: request.params,
        body: request.body,
        auth: request.auth,
        settings: request.settings
      })

      setTabs((prev) =>
        prev.map((t) =>
          t.id === id ? { ...t, response: resp, updateTime: new Date().toISOString() } : t
        )
      )

      // Save to history (scoped to current workspace)
      requestManager.addHistory({
        workspaceId,
        method: request.method,
        url: request.url,
        statusCode: resp.status,
        costTime: resp.duration,
        requestSnapshot: JSON.stringify(request),
        responseSnapshot: resp.body ? JSON.stringify(resp).slice(0, 10000) : undefined
      })
    } catch (err) {
      console.error('[Workspace] Send failed:', err)
      setTabs((prev) =>
        prev.map((t) =>
          t.id === id
            ? {
                ...t,
                response: {
                  status: 0,
                  statusText: i18nT('response.error.failed'),
                  body: (err as Error).message,
                  error: { code: 'UNKNOWN', message: (err as Error).message }
                },
                updateTime: new Date().toISOString()
              }
            : t
        )
      )
    } finally {
      sendingRef.current.delete(id)
    }
  }, [requestManager, i18nT, workspaceId])

  const handleCancel = useCallback((id: string) => {
    window.api.abortRequest(id)
    sendingRef.current.delete(id)
  }, [])

  const handleSplitDrag = useCallback((deltaX: number) => {
    const container = document.getElementById('req-resp-container')
    if (!container) return
    const rect = container.getBoundingClientRect()
    if (rect.width <= 0) return
    const deltaPct = (deltaX / rect.width) * 100
    setSplitPercent((prev) => Math.min(80, Math.max(20, prev + deltaPct)))
  }, [])

  const activeTab = tabs.find((t) => t.id === activeTabId) || tabs[0]
  const isSending = sendingRef.current.has(activeTabId)

  return (
    <Box sx={{ display: 'flex', height: '100%', overflow: 'hidden' }}>
      <Sidebar workspaceId={workspaceId} />
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Tab bar */}
        <TabBar
          tabs={tabs}
          activeId={activeTabId}
          onSelect={setActiveTabId}
          onClose={closeTab}
          onAdd={addTab}
          onRename={handleRename}
        />

        {/* Request/Response split area */}
        <Box sx={{ flex: 1, minHeight: 0, p: 1, display: 'flex', flexDirection: 'column' }}>
          {/* URL bar */}
          <Paper elevation={1} sx={{ p: 1, mb: 1, flex: 'none' }}>
            <AddressBar
              request={activeTab}
              onChange={handleRequestChange}
              onSend={handleSend}
              isLoading={isSending}
              onCancel={() => handleCancel(activeTabId)}
            />
          </Paper>

          {/* Left-right split */}
          <Box
            id="req-resp-container"
            sx={{ display: 'flex', flex: 1, gap: 1, minHeight: 0, minWidth: 0 }}
          >
            {/* Left: Request editor */}
            <Box sx={{ width: `${splitPercent}%`, display: 'flex', minWidth: 0 }}>
              <Paper
                sx={{
                  p: 1,
                  flex: 1,
                  display: 'flex',
                  minHeight: 0,
                  minWidth: 0,
                  overflow: 'auto'
                }}
              >
                <RequestArea request={activeTab} onChange={handleRequestChange} />
              </Paper>
            </Box>

            {/* Splitter */}
            <Splitter onDrag={handleSplitDrag} />

            {/* Right: Response viewer */}
            <Box sx={{ width: `${100 - splitPercent}%`, display: 'flex', minWidth: 0 }}>
              <Paper
                sx={{
                  p: 1,
                  flex: 1,
                  display: 'flex',
                  minHeight: 0,
                  minWidth: 0,
                  overflow: 'auto'
                }}
              >
                <ResponseArea response={activeTab.response} />
              </Paper>
            </Box>
          </Box>
        </Box>
      </Box>
      <ToolSideBar request={activeTab} />
    </Box>
  )
}

export default function WorkspacePage(): React.JSX.Element {
  return (
    <RequestManagerProvider>
      <WorkspaceInner />
    </RequestManagerProvider>
  )
}
