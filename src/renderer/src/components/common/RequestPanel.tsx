import React, { useState } from 'react'
import { Box, Paper } from '@mui/material'
import AddressBar from '@renderer/components/request/AddressBar'
import RequestArea from '@renderer/components/request/RequestArea'
import ResponseArea from '@renderer/components/response/ResponseArea'
import Splitter from '@renderer/components/common/Splitter'
import { HttpMethod, HttpRequest } from '../../types/request'
import { Request, Response } from '@shared/types'
import { HTTPResponse } from '@renderer/types/response'

export default function RequestPanel(): React.JSX.Element {
  const [request, setRequest] = useState<HttpRequest>({
    method: HttpMethod.GET
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
      let url = request?.url || ''
      if (!/^http(s)?:\/\//.test(url)) {
        url = `http://${url}`
      }
      const urlObj = new URL(url)

      const headers: Record<string, string> = {}
      request?.headers?.forEach((row) => {
        if (row.key && row.enabled) {
          headers[row.key] = row.value || ''
        }
      })
      const req: Request = {
        id: Date.now().toString(),
        url: urlObj.toString(),
        method: request?.method as string,
        headers: headers
      }
      if (request?.body?.length && request?.method?.toUpperCase() !== 'GET') {
        req.body = request.body
      }

      setCurrentReqId(req.id)
      const response = (await window.api.sendRequest(req)) as Response

      const resHeaders: Record<string, string> = {}
      Object.entries(response.headers).forEach(([key, value]) => {
        resHeaders[key] = Array.isArray(value) ? value.join('; ') : value
      })

      setResponse({
        status: response.status,
        statusText: response.statusText,
        headers: resHeaders,
        body: response.body,
        duration: response.duration
      })
    } catch (err) {
      setResponse({
        status: 0,
        statusText: String(err),
        headers: {},
        body: ''
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
        flexDirection: 'row',
        p: 1,
        gap: 1,
        bgcolor: 'background.default'
      }}
    >
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
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
          sx={{ display: 'flex', flex: 1, gap: 1, alignItems: 'stretch', minHeight: 0 }}
        >
          <Box sx={{ width: `${centerPct}%`, display: 'flex' }}>
            <Paper sx={{ p: 1, flex: 1, display: 'flex', minHeight: 0 }}>
              <RequestArea request={request} onChange={setRequest} />
            </Paper>
          </Box>

          <Splitter onDrag={onDragCenter} />

          <Box sx={{ width: `${100 - centerPct}%`, display: 'flex' }}>
            <Paper sx={{ p: 1, flex: 1, display: 'flex', minHeight: 0 }}>
              <ResponseArea response={response} />
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
