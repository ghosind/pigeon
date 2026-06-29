import React from 'react'
import { Box, Tabs, Tab } from '@mui/material'
import { useI18n } from '../../contexts/useI18n'
import KeyValueEditor from './KeyValueEditor'
import AuthorizationEditor from './AuthorizationEditor'
import BodyEditor from './BodyEditor'
import { Url } from '@shared/utils/url'
import { RequestModel, KeyValuePair, HTTPBody, HTTPAuthorization } from '@shared/types'

type RequestAreaProps = {
  request: RequestModel
  onChange: (request: RequestModel) => void
}

export default function RequestArea({ request, onChange }: RequestAreaProps): React.ReactElement {
  const [tab, setTab] = React.useState(0)
  const { t } = useI18n()

  const onParamsChange = (params: KeyValuePair[]): void => {
    // Auto-sync params to URL
    if (!request.url) {
      onChange({ ...request, params })
      return
    }

    try {
      const urlObj = new Url(request.url)
      urlObj.search = ''
      params.forEach((row) => {
        if (row.key && row.enabled !== false) {
          urlObj.searchParams.append(row.key, row.value || '')
        }
      })
      onChange({ ...request, params, url: urlObj.toString() })
    } catch {
      // URL parse failed, just update params
      onChange({ ...request, params })
    }
  }

  const onHeadersChange = (headers: KeyValuePair[]): void => {
    onChange({ ...request, headers })
  }

  const onAuthChange = (auth: HTTPAuthorization): void => {
    onChange({ ...request, auth })
  }

  const onBodyChange = (body: HTTPBody): void => {
    onChange({ ...request, body })
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
        {tab === 0 && <KeyValueEditor rows={request.params || []} onChange={onParamsChange} />}
        {tab === 1 && <KeyValueEditor rows={request.headers || []} onChange={onHeadersChange} />}
        {tab === 2 && <AuthorizationEditor request={request} onChange={onAuthChange} />}
        {tab === 3 && <BodyEditor body={request.body} onChange={onBodyChange} />}
      </Box>
    </Box>
  )
}
