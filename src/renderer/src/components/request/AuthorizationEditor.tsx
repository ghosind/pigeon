import React from 'react'
import { Box, FormControl, Select, MenuItem, TextField } from '@mui/material'
import { HTTPRequest } from '@shared/types'
import { useI18n } from '../../contexts/useI18n'

type AuthorizationEditorProps = {
  request: HTTPRequest
  onChange: (request: HTTPRequest) => void
}

export default function AuthorizationEditor({
  request,
  onChange
}: AuthorizationEditorProps): React.ReactElement {
  const { t } = useI18n()

  const updateAuth = (val: {
    type?: 'none' | 'basic' | 'bearer'
    username?: string
    password?: string
    token?: string
  }): void => {
    const prev = request?.auth || { type: 'none' }
    let headers = request?.headers || []
    let authorization: string | undefined

    switch (val.type || prev.type) {
      case 'basic': {
        const cred = `${val.username || prev.username}:${val.password || prev.password}`
        try {
          const b = btoa(cred)
          authorization = `Basic ${b}`
        } catch (err) {
          console.error('Failed to encode basic auth:', err)
          authorization = `Basic ${cred}`
        }
        break
      }
      case 'bearer':
        authorization = `Bearer ${val.token || prev.token}`
        break
    }

    if (authorization) {
      if (!headers.some((h) => h.key?.toLowerCase() === 'authorization')) {
        headers = [{ key: 'Authorization', value: authorization, enabled: true }, ...headers]
      } else {
        headers = headers.map((h) =>
          h.key?.toLowerCase() === 'authorization' ? { ...h, value: authorization! } : h
        )
      }
    } else {
      headers = headers.filter((h) => h.key?.toLowerCase() !== 'authorization')
    }

    onChange({
      ...request,
      headers,
      auth: {
        type: val.type || prev.type,
        username: val.username || prev.username,
        password: val.password || prev.password,
        token: val.token || prev.token
      }
    })
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <Select
          value={request?.auth?.type || 'none'}
          size="small"
          variant="standard"
          onChange={(e) => {
            const next = e.target.value as 'none' | 'basic' | 'bearer'
            updateAuth({
              type: next
            })
          }}
        >
          <MenuItem value="none">{t('request.auth.none')}</MenuItem>
          <MenuItem value="basic">{t('request.auth.basic')}</MenuItem>
          <MenuItem value="bearer">{t('request.auth.bearer')}</MenuItem>
        </Select>
      </FormControl>

      {request?.auth?.type === 'basic' && (
        <Box sx={{ pl: 0, display: 'flex', gap: 1, flexDirection: 'column' }}>
          <TextField
            size="small"
            placeholder={t('request.auth.username')}
            value={request?.auth?.username || ''}
            onChange={(e) => {
              updateAuth({
                username: e.target.value
              })
            }}
          />
          <TextField
            size="small"
            placeholder={t('request.auth.password')}
            type="password"
            value={request?.auth?.password || ''}
            onChange={(e) => {
              updateAuth({
                password: e.target.value
              })
            }}
          />
        </Box>
      )}

      {request?.auth?.type === 'bearer' && (
        <Box sx={{ pl: 0 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={t('request.auth.token')}
            value={request?.auth?.token || ''}
            onChange={(e) => {
              updateAuth({
                token: e.target.value
              })
            }}
          />
        </Box>
      )}
    </Box>
  )
}
