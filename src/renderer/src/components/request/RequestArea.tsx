import React from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import { useI18n } from '../../contexts/useI18n'
import KeyValueEditor from './KeyValueEditor'
import AuthorizationEditor from './AuthorizationEditor'
import BodyEditor from './BodyEditor'
import { Request, HTTPRequest } from '@shared/types'
import { Url } from '@shared/utils/url'

type RequestAreaProps = {
  request: Request
  onChange: (request: Request) => void
}

export default function RequestArea({ request, onChange }: RequestAreaProps): React.ReactElement {
  const [tab, setTab] = React.useState(0)
  const { t } = useI18n()

  const onParamsChange = (params: HTTPRequest['params']): void => {
    const { url } = request?.request || {}
    const urlObj = new Url(url || '')
    const search = new URLSearchParams()
    params?.forEach((row) => {
      if (row.key && row.enabled === true) {
        search.append(row.key, row.value || '')
      }
    })
    urlObj.search = search.toString()

    onChange({
      ...request,
      request: {
        ...request.request,
        url: urlObj.toString(),
        params
      }
    })
  }

  const onHeadersChange = (headers: HTTPRequest['headers']): void => {
    onChange({ ...request, request: { ...request.request, headers } })
  }

  const onBodyChange = (body: HTTPRequest['body']): void => {
    onChange({ ...request, request: { ...request.request, body } })
  }

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        width: '100%',
        minWidth: 0,
        flex: 1
      }}
    >
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: 'divider' }}
      >
        <Tab label={t('request.tab.params')} />
        <Tab label={t('request.tab.headers')} />
        <Tab label={t('request.tab.auth')} />
        <Tab label={t('request.tab.body')} />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', p: 1, minHeight: 0 }}>
        {tab === 0 && (
          <KeyValueEditor rows={request?.request.params || []} onChange={onParamsChange} />
        )}
        {tab === 1 && (
          <KeyValueEditor rows={request?.request.headers || []} onChange={onHeadersChange} />
        )}
        {tab === 2 && (
          <AuthorizationEditor
            headers={request?.request.headers || []}
            onChange={onHeadersChange}
          />
        )}
        {tab === 3 && <BodyEditor body={request?.request.body} onChange={onBodyChange} />}
      </Box>
    </Box>
  )
}
