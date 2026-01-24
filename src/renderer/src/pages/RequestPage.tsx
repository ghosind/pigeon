import React, { useState } from 'react'
import * as uuid from 'uuid'
import { Box } from '@mui/material'
import TabBar from '@renderer/components/common/TabBar'
import RequestPanel from '@renderer/components/common/RequestPanel'
import { HTTPMethod, HTTPRequest, Request, RequestType } from '@shared/types'
import { useI18n } from '@renderer/contexts/useI18n'
import { useRequestManager } from '@renderer/contexts/useRequestManager'

export default function RequestPage(): React.JSX.Element {
  const { t } = useI18n()
  const requestManager = useRequestManager()
  const [tabs, setTabs] = useState<Request[]>(() => [
    {
      id: uuid.v4(),
      title: t('default.tab.title'),
      request: { method: HTTPMethod.GET, url: '' },
      type: RequestType.HTTP
    }
  ])
  const [activeId, setActiveId] = useState<string>(tabs[0].id)
  const request = tabs.find((t) => t.id === activeId)?.request || {
    method: HTTPMethod.GET,
    url: ''
  }
  const response = tabs.find((t) => t.id === activeId)?.response
  const sendingRef = React.useRef<Record<string, boolean>>({})

  const addTab = (): void => {
    const id = uuid.v4()
    const newTab: Request = {
      id,
      title: t('default.tab.title'),
      request: { method: HTTPMethod.GET, url: '' },
      type: RequestType.HTTP
    }
    setTabs((t) => [...t, newTab])
    setActiveId(id)
  }

  React.useEffect(() => {
    // register open handler so sidebar can open requests
    requestManager.registerOpenHandler((req, opts) => {
      if (opts?.newTab) {
        const id = uuid.v4()
        const newTab: Request = {
          id,
          title: t('default.tab.title'),
          request: req,
          type: RequestType.HTTP
        }
        setTabs((s) => [...s, newTab])
        setActiveId(id)
      } else {
        setTabs((ts) => ts.map((t) => (t.id === activeId ? { ...t, request: req } : t)))
      }
    })
    return () => requestManager.registerOpenHandler(null)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [requestManager, activeId])

  const handleRename = (id: string, title: string): void => {
    setTabs((ts) => ts.map((t) => (t.id === id ? { ...t, title } : t)))
  }

  const handleReorder = (fromId: string, toId: string): void => {
    setTabs((prev) => {
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

  const closeTab = (id: string): void => {
    setTabs((t) => t.filter((tab) => tab.id !== id))
    if (activeId === id) {
      if (tabs.length > 1) {
        const idx = tabs.findIndex((tab) => tab.id === id)
        const newActiveTab = tabs[idx === 0 ? 1 : idx - 1]
        setActiveId(newActiveTab.id)
      } else {
        const newId = uuid.v4()
        const newTab: Request = {
          id: newId,
          title: 'Untitled Request',
          request: { method: HTTPMethod.GET, url: '' },
          type: RequestType.HTTP
        }
        setTabs([newTab])
        setActiveId(newId)
      }
    }
  }

  const selectTab = (id: string): void => setActiveId(id)

  const handleChange = (updatedRequest: HTTPRequest): void => {
    setTabs((ts) => ts.map((t) => (t.id === activeId ? { ...t, request: updatedRequest } : t)))
  }

  const handleSend = async (): Promise<void> => {
    if (sendingRef.current[activeId]) {
      return
    }
    sendingRef.current[activeId] = true
    try {
      const resp = await window.api.sendRequest(activeId, request)
      setTabs((ts) => ts.map((t) => (t.id === activeId ? { ...t, response: resp } : t)))
      try {
        requestManager.addHistory(request)
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
        tabs={tabs.map((t) => ({ id: t.id, title: t.title }))}
        activeId={activeId}
        onSelect={selectTab}
        onClose={closeTab}
        onAdd={addTab}
        onRename={handleRename}
        onReorder={handleReorder}
      />
      <Box sx={{ flex: 1, minHeight: 0 }}>
        <RequestPanel
          id={activeId}
          request={request}
          onChange={handleChange}
          response={response}
          onSend={handleSend}
          onCancel={handleCancel}
        />
      </Box>
    </Box>
  )
}

// register open handler after component so sidebar can open requests into tabs
// (open handler registration is done inside the component)
