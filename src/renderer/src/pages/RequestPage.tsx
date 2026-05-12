import React, { useState } from 'react'
import * as uuid from 'uuid'
import { Box } from '@mui/material'
import TabBar from '@renderer/components/common/TabBar'
import RequestPanel from '@renderer/components/common/RequestPanel'
import { HTTPMethod, Request, RequestType } from '@shared/types'
import { OpenRequestOptions, useRequestManager } from '@renderer/contexts/useRequestManager'

function createEmptyRequest(): Request {
  return {
    id: uuid.v4(),
    request: { method: HTTPMethod.GET, url: '' },
    type: RequestType.HTTP
  }
}

export default function RequestPage(): React.JSX.Element {
  const requestManager = useRequestManager()
  const [requests, setRequests] = useState<Request[]>(() => [createEmptyRequest()])
  const [activeId, setActiveId] = useState<string>(requests[0].id)
  const sendingRef = React.useRef<Record<string, boolean>>({})
  const requestsRef = React.useRef<Request[]>(requests)
  const activeIdRef = React.useRef<string>(activeId)

  React.useEffect(() => {
    requestsRef.current = requests
  }, [requests])

  React.useEffect(() => {
    activeIdRef.current = activeId
  }, [activeId])

  const closeRequest = React.useCallback((id: string): void => {
    let nextActiveId: string | null = null

    setRequests((prev) => {
      const idx = prev.findIndex((req) => req.id === id)
      if (idx === -1) {
        return prev
      }

      const filtered = prev.filter((req) => req.id !== id)

      if (activeIdRef.current === id) {
        if (filtered.length === 0) {
          const fallback = createEmptyRequest()
          nextActiveId = fallback.id
          return [fallback]
        }

        const fallbackIndex = Math.min(idx, filtered.length - 1)
        nextActiveId = filtered[fallbackIndex].id
      }

      return filtered
    })

    if (nextActiveId) {
      setActiveId(nextActiveId)
    }
  }, [])

  React.useEffect(() => {
    requestManager.registerOpenHandler((req: Request, opts?: OpenRequestOptions) => {
      const incoming = req.id ? req : { ...req, id: uuid.v4() }
      const id = incoming.id

      setRequests((prev) => {
        const exists = prev.some((t) => t.id === id)
        if (!exists && (opts?.newTab ?? true)) {
          return [...prev, incoming]
        }
        return prev.map((t) => (t.id === id ? incoming : t))
      })

      if (opts?.active ?? true) {
        setActiveId(id)
      }
    })
    return () => requestManager.registerOpenHandler(null)
  }, [requestManager])

  React.useEffect(() => {
    if (requestManager.registerCloseHandler) {
      requestManager.registerCloseHandler(() => {
        closeRequest(activeIdRef.current)
      })
      return () => requestManager.registerCloseHandler && requestManager.registerCloseHandler(null)
    }
    return undefined
  }, [requestManager, closeRequest])

  React.useEffect(() => {
    requestManager.registerCollectionChangeHandler((removedIds) => {
      setRequests((ts) =>
        ts.map((t) => (removedIds.includes(t.id) ? { ...t, isInCollection: false } : t))
      )
    })
    return () => requestManager.registerCollectionChangeHandler(null)
  }, [requestManager])

  const addRequest = (): void => {
    const newReq = createEmptyRequest()
    setRequests((t) => [...t, newReq])
    setActiveId(newReq.id)
  }

  const handleRename = (id: string, title: string): void => {
    const isTitled = title.trim().length > 0
    setRequests((ts) => ts.map((t) => (t.id === id ? { ...t, title, isTitled } : t)))
  }

  const handleReorder = (fromId: string, toId: string): void => {
    setRequests((prev) => {
      const fromIdx = prev.findIndex((t) => t.id === fromId)
      if (fromIdx === -1) {
        return prev
      }
      const item = prev[fromIdx]
      const without = prev.filter((t) => t.id !== fromId)
      const targetIdx = without.findIndex((t) => t.id === toId)
      const insertAt = targetIdx === -1 ? without.length : targetIdx
      const next = [...without.slice(0, insertAt), item, ...without.slice(insertAt)]
      return next
    })
  }

  const selectRequest = (id: string): void => setActiveId(id)

  const handleChange = (updatedRequest: Request): void => {
    setRequests((ts) => ts.map((t) => (t.id === updatedRequest.id ? updatedRequest : t)))
  }

  const handleSend = async (): Promise<void> => {
    const currentActiveId = activeIdRef.current
    if (sendingRef.current[currentActiveId]) {
      return
    }
    sendingRef.current[currentActiveId] = true

    try {
      const request = requestsRef.current.find((t) => t.id === currentActiveId)
      if (!request) {
        return
      }

      const resp = await window.api.sendRequest(currentActiveId, request.request)
      const requestWithResponse: Request = { ...request, response: resp }
      setRequests((ts) =>
        ts.map((t) =>
          t.id === currentActiveId ? { ...requestWithResponse, request: t.request } : t
        )
      )

      try {
        requestManager.addHistory(requestWithResponse)
      } catch (e) {
        console.error(e)
      }
    } finally {
      delete sendingRef.current[currentActiveId]
    }
  }

  const handleCancel = (id: string): void => {
    window.api.abortRequest(id)
  }

  const activeRequest = requests.find((t) => t.id === activeId) || requests[0]

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <TabBar
        requests={requests}
        activeId={activeId}
        onSelect={selectRequest}
        onClose={closeRequest}
        onAdd={addRequest}
        onRename={handleRename}
        onReorder={handleReorder}
      />
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <RequestPanel
          id={activeRequest.id}
          request={activeRequest}
          onChange={handleChange}
          onSend={handleSend}
          onCancel={handleCancel}
        />
      </Box>
    </Box>
  )
}
