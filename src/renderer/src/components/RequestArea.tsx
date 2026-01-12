import React from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import KeyValueEditor from './KeyValueEditor'
import BodyEditor from './BodyEditor'
import { HttpRequest } from '@renderer/types/request'

type RequestAreaProps = {
  request: HttpRequest
  onChange: (request: HttpRequest) => void
}

export default function RequestArea({ request, onChange }: RequestAreaProps) {
  const [tab, setTab] = React.useState(0)

  const onParamsChange = (params: HttpRequest['params']) => {
    onChange({ ...request, params })
  }

  const onHeadersChange = (headers: HttpRequest['headers']) => {
    onChange({ ...request, headers })
  }

  const onBodyChange = (body: HttpRequest['body']) => {
    onChange({ ...request, body })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label="Params" />
        <Tab label="Headers" />
        <Tab label="Body" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1, minHeight: 0 }}>
        {tab === 0 && <KeyValueEditor rows={request.params || []} onChange={onParamsChange} />}
        {tab === 1 && <KeyValueEditor rows={request.headers || []} onChange={onHeadersChange} />}
        {tab === 2 && <BodyEditor body={request.body || ''} onChange={onBodyChange} />}
      </Box>
    </Box>
  )
}
