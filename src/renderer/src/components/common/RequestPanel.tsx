import React, { useState } from 'react'
import { Box, Paper } from '@mui/material'
import AddressBar from '@renderer/components/request/AddressBar'
import RequestArea from '@renderer/components/request/RequestArea'
import ResponseArea from '@renderer/components/response/ResponseArea'
import Splitter from '@renderer/components/common/Splitter'
import { HTTPRequest } from '@shared/types/request'
import { HTTPResponse } from '@shared/types/response'

type RequestPanelProps = {
  id: string
  request: HTTPRequest
  onChange: (r: HTTPRequest) => void
  response?: HTTPResponse
  onSend?: () => Promise<void>
  onCancel?: (id: string) => void
}

export default function RequestPanel({
  id,
  request,
  onChange,
  response,
  onSend,
  onCancel
}: RequestPanelProps): React.JSX.Element {
  const [isLoading, setIsLoading] = useState<boolean>(false)

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

  const handleSend = async (): Promise<void> => {
    try {
      setIsLoading(true)

      await onSend?.()
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = (): void => {
    onCancel?.(id)
    setIsLoading(false)
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
            onChange={onChange}
            onSend={handleSend}
            isLoading={isLoading}
            onCancel={handleCancel}
          />
        </Paper>

        <Box
          id="req-resp-container"
          sx={{
            display: 'flex',
            flex: 1,
            gap: 1,
            alignItems: 'stretch',
            minHeight: 0,
            minWidth: 0
          }}
        >
          <Box sx={{ width: `${centerPct}%`, display: 'flex', minWidth: 0 }}>
            <Paper sx={{ p: 1, flex: 1, display: 'flex', minHeight: 0, minWidth: 0 }}>
              <RequestArea request={request} onChange={onChange} />
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
