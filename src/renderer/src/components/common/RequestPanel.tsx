import React, { useState } from 'react'
import { Box, Paper } from '@mui/material'
import AddressBar from '@renderer/components/request/AddressBar'
import RequestArea from '@renderer/components/request/RequestArea'
import ResponseArea from '@renderer/components/response/ResponseArea'
import Splitter from '@renderer/components/common/Splitter'
import { HTTPMethod, HTTPRequest } from '@shared/types/request'
import { HTTPResponse } from '@shared/types/response'

export default function RequestPanel(): React.JSX.Element {
  const [request, setRequest] = useState<HTTPRequest>({
    method: HTTPMethod.GET,
    url: ''
  })
  const [response, setResponse] = useState<HTTPResponse | null>(null)
  const [isLoading, setIsLoading] = useState<boolean>(false)
  const [currentReqId, setCurrentReqId] = useState<string | null>(null)

  const [centerPct, setCenterPct] = useState<number>(50)

  const onDragCenter = React.useCallback((deltaX: number) => {
    const container = document.getElementById('req-resp-container')
    if (!container) {
      return
    }
    const rect = container.getBoundingClientRect()
    if (rect.width <= 0) {
      return
    }
    const deltaPct = (deltaX / rect.width) * 100
    setCenterPct((prev) => Math.min(90, Math.max(10, prev + deltaPct)))
  }, [])

  const doSend = async (): Promise<void> => {
    try {
      setIsLoading(true)
      const id = Date.now().toString()
      setCurrentReqId(id)
      const response = await window.api.sendRequest(id, request)
      console.log('Response received:', response)

      setResponse(response)
    } catch (err) {
      setResponse({
        statusText: String(err)
      })
    } finally {
      setIsLoading(false)
      setCurrentReqId(null)
    }
  }

  const handleCancel = (): void => {
    if (currentReqId) {
      window.api.abortRequest(currentReqId)
    }
    setIsLoading(false)
    setCurrentReqId(null)
  }

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flex: 1,
        flexDirection: 'row',
        p: 1,
        gap: 1,
        bgcolor: 'background.default',
        minWidth: 0
      }}
    >
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, minWidth: 0 }}>
        <Paper elevation={1} sx={{ p: 1, mb: 1, flex: 'none' }}>
          <AddressBar
            request={request}
            onChange={setRequest}
            onSend={doSend}
            isLoading={isLoading}
            onCancel={handleCancel}
          />
        </Paper>

        <Box
          id="req-resp-container"
          sx={{ display: 'flex', flex: 1, gap: 1, alignItems: 'stretch', minHeight: 0, minWidth: 0 }}
        >
          <Box sx={{ width: `${centerPct}%`, display: 'flex', minWidth: 0 }}>
            <Paper sx={{ p: 1, flex: 1, display: 'flex', minHeight: 0, minWidth: 0 }}>
              <RequestArea request={request} onChange={setRequest} />
            </Paper>
          </Box>

          <Splitter onDrag={onDragCenter} />

          <Box sx={{ width: `${100 - centerPct}%`, display: 'flex', minWidth: 0 }}>
            <Paper sx={{ p: 1, flex: 1, display: 'flex', minHeight: 0, minWidth: 0 }}>
              <ResponseArea response={response} />
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
