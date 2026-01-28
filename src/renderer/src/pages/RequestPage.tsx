import React, { useState } from 'react'
import * as uuid from 'uuid'
import { Box } from '@mui/material'
import TabBar from '@renderer/components/common/TabBar'
import RequestPanel from '@renderer/components/common/RequestPanel'
import { HTTPMethod, Request, RequestType } from '@shared/types'
import { useRequestManager } from '@renderer/contexts/useRequestManager'

export default function RequestPage(): React.JSX.Element {
  const requestManager = useRequestManager()
  const [requests, setRequests] = useState<Request[]>(() => [
    {
      id: uuid.v4(),
      request: { method: HTTPMethod.GET, url: '' },
      type: RequestType.HTTP
    }
  ])
  const [activeId, setActiveId] = useState<string>(requests[0].id)
  const sendingRef = React.useRef<Record<string, boolean>>({})

  React.useEffect(() => {
    requestManager.registerOpenHandler((req) => {
      const id = req.id || uuid.v4()
      const exists = requests.find((t) => t.id === id)
      if (!exists) {
        setRequests((s) => [...s, req])
      }
      setActiveId(id)
    })
    return () => requestManager.registerOpenHandler(null)
  }, [requestManager, activeId, requests])

  React.useEffect(() => {
    requestManager.registerCollectionChangeHandler((removedIds) => {
      setRequests((ts) => ts.map((t) => (removedIds.includes(t.id) ? { ...t, isInCollection: false } : t)))
    })
    return () => requestManager.registerCollectionChangeHandler(null)
  }, [requestManager])

  const addRequest = (): void => {
    const id = uuid.v4()
    const newReq: Request = {
      id,
      request: { method: HTTPMethod.GET, url: '' },
      type: RequestType.HTTP
    }
    setRequests((t) => [...t, newReq])
    setActiveId(id)
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

  const closeRequest = (id: string): void => {
    setRequests((t) => t.filter((req) => req.id !== id))
    if (activeId === id) {
      if (requests.length > 1) {
        const idx = requests.findIndex((req) => req.id === id)
        const newActiveRequest = requests[idx === 0 ? 1 : idx - 1]
        setActiveId(newActiveRequest.id)
      } else {
        const newId = uuid.v4()
        const newReq: Request = {
          id: newId,
          request: { method: HTTPMethod.GET, url: '' },
          type: RequestType.HTTP
        }
        setRequests([newReq])
        setActiveId(newId)
      }
    }
  }

  const selectRequest = (id: string): void => setActiveId(id)

  const handleChange = (updatedRequest: Request): void => {
    setRequests((ts) => ts.map((t) => (t.id === activeId ? updatedRequest : t)))
  }

  const handleSend = async (): Promise<void> => {
    if (sendingRef.current[activeId]) {
      return
    }
    sendingRef.current[activeId] = true
    try {
      const request = requests.find((t) => t.id === activeId)
      if (!request) {
        return
      }
      const resp = await window.api.sendRequest(activeId, request?.request)
      setRequests((ts) => ts.map((t) => (t.id === activeId ? { ...t, response: resp } : t)))
      const req = requests.find((t) => t.id === activeId)
      try {
        if (req) {
          requestManager.addHistory(req)
        }
      } catch (e) {
        console.error(e)
      }
    } finally {
      delete sendingRef.current[activeId]
    }
  }

  const handleCancel = (id: string): void => {
    window.api.abortRequest(id)
  }

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
          id={activeId}
          request={requests.find((t) => t.id === activeId)!}
          onChange={handleChange}
          onSend={handleSend}
          onCancel={handleCancel}
        />
      </Box>
    </Box>
  )
}
