import React, { useState } from 'react'
import { Box, Paper } from '@mui/material'
import AddressBar from '../components/AddressBar'
import RequestArea from '../components/RequestArea'
import ResponsePanel from '../components/ResponsePanel'
import Splitter from '../components/Splitter'
import { HttpRequest } from '../types/request'
import { Request } from '@shared/types/request'

export type KeyValue = { id: string; key?: string; value?: string; enabled?: boolean }

export default function RequestPage(): React.JSX.Element {
  const [request, setRequest] = useState<HttpRequest>({});
  const [response, setResponse] = useState<any>(null)

  const [centerPct, setCenterPct] = useState<number>(58)

  const onDragCenter = React.useCallback((deltaX: number) => {
    const container = document.getElementById('req-resp-container')
    if (!container) return
    const rect = container.getBoundingClientRect()
    if (rect.width <= 0) return
    const deltaPct = (deltaX / rect.width) * 100
    setCenterPct((prev) => Math.min(90, Math.max(10, prev + deltaPct)))
  }, [])

  const doSend = async () => {
    try {
      const urlObj = new URL(request?.url || '')
      request?.params?.forEach((row) => {
        if (row.key) urlObj.searchParams.set(row.key, row.value || '')
      })
      const req: Request = {
        id: '',
        url: urlObj.toString(),
        method: request?.method as string,
        headers: {}
      }
      request?.headers?.forEach((row) => {
        if (row.key) (req.headers as any)[row.key] = row.value || ''
      })
      if (request?.body && request.body.length && request?.method?.toUpperCase() !== 'GET') req.body = request.body

      const res = await window.api.sendRequest(req) as Response

      const resHeaders: Record<string, string> = {}
      res.headers.forEach((v, k) => (resHeaders[k] = v))
      setResponse({ status: res.status, statusText: res.statusText, headers: resHeaders, body: res.body })
    } catch (err) {
      setResponse({ status: 0, statusText: String(err), headers: {}, body: '' })
    }
  }

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'row', p: 1, gap: 1, bgcolor: 'background.default' }}>
      <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
        <Paper elevation={1} sx={{ p: 1, mb: 1, flex: 'none' }}>
          <AddressBar
            request={request}
            onChange={setRequest}
            onSend={doSend}
          />
        </Paper>

        <Box id="req-resp-container" sx={{ display: 'flex', flex: 1, gap: 1, alignItems: 'stretch', minHeight: 0 }}>
          <Box sx={{ width: `${centerPct}%`, display: 'flex' }}>
            <Paper sx={{ p: 1, flex: 1, display: 'flex', minHeight: 0 }}>
              <RequestArea request={request} onChange={setRequest} />
            </Paper>
          </Box>

          <Splitter onDrag={onDragCenter} />

          <Box sx={{ width: `${100 - centerPct}%`, display: 'flex' }}>
            <Paper sx={{ p: 1, flex: 1, display: 'flex', minHeight: 0 }}>
              <ResponsePanel response={response} />
            </Paper>
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
