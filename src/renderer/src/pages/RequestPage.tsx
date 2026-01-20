import React, { useState } from 'react'
import * as uuid from 'uuid'
import { Box } from '@mui/material'
import TabBar from '@renderer/components/common/TabBar'
import RequestPanel from '@renderer/components/common/RequestPanel'
import { HTTPMethod, HTTPRequest, HTTPResponse } from '@shared/types'

type Tab = {
  id: string
  title: string
  request: HTTPRequest
  response?: HTTPResponse
}

export default function RequestPage(): React.JSX.Element {
  const [tabs, setTabs] = useState<Tab[]>(() => [
    { id: uuid.v4(), title: 'Untitled Request', request: { method: HTTPMethod.GET, url: '' } }
  ])
  const [activeId, setActiveId] = useState<string>(tabs[0].id)
  const request = tabs.find((t) => t.id === activeId)?.request || {
    method: HTTPMethod.GET,
    url: ''
  }
  const response = tabs.find((t) => t.id === activeId)?.response

  const addTab = (): void => {
    const id = uuid.v4()
    const newTab: Tab = {
      id,
      title: 'Untitled Request',
      request: { method: HTTPMethod.GET, url: '' }
    }
    setTabs((t) => [...t, newTab])
    setActiveId(id)
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
        const newTab: Tab = {
          id: newId,
          title: 'Untitled Request',
          request: { method: HTTPMethod.GET, url: '' }
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
    const resp = await window.api.sendRequest(activeId, request)
    setTabs((ts) => ts.map((t) => (t.id === activeId ? { ...t, response: resp } : t)))
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
