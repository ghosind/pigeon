import React from 'react'
import { Box, FormControl, Select, MenuItem, TextField } from '@mui/material'
import { KeyValuePair } from '@shared/types/kv'
import { useI18n } from '../../contexts/useI18n'

type Props = {
  headers: KeyValuePair[]
  onChange: (headers: KeyValuePair[]) => void
}

export default function AuthorizationEditor({ headers, onChange }: Props): React.ReactElement {
  const { t } = useI18n()

  const findAuth = (): {
    type: 'none' | 'basic' | 'bearer'
    user?: string
    pass?: string
    token?: string
  } => {
    const auth = (headers || []).find(
      (h) => h.key?.toLowerCase() === 'authorization' && h.enabled !== false
    )
    if (!auth || !auth.value) return { type: 'none' }
    const v = auth.value
    if (v.startsWith('Basic ')) {
      try {
        const payload = atob(v.slice(6))
        const idx = payload.indexOf(':')
        if (idx >= 0) {
          return { type: 'basic', user: payload.slice(0, idx), pass: payload.slice(idx + 1) }
        }
      } catch (err) {
        console.error('Failed to decode basic auth:', err)
        return { type: 'basic' }
      }
      return { type: 'basic' }
    }
    if (v.startsWith('Bearer ')) {
      return { type: 'bearer', token: v.slice(7) }
    }
    return { type: 'none' }
  }

  const initial = findAuth()
  const [type, setType] = React.useState(initial.type)
  const [username, setUsername] = React.useState(initial.user ?? '')
  const [password, setPassword] = React.useState(initial.pass ?? '')
  const [token, setToken] = React.useState(initial.token ?? '')

  const updateHeaders = (next: KeyValuePair[]): void => {
    onChange(next)
  }

  const applyAuth = (
    nextType: string,
    nextUser = username,
    nextPass = password,
    nextToken = token
  ): void => {
    let next = (headers || []).filter((h) => h.key?.toLowerCase() !== 'authorization')

    if (nextType === 'basic') {
      const cred = `${nextUser ?? ''}:${nextPass ?? ''}`
      try {
        const b = btoa(cred)
        next = [{ key: 'Authorization', value: `Basic ${b}`, enabled: true }, ...next]
      } catch (err) {
        console.error('Failed to encode basic auth:', err)
        next = [{ key: 'Authorization', value: `Basic ${cred}`, enabled: true }, ...next]
      }
    } else if (nextType === 'bearer') {
      next = [{ key: 'Authorization', value: `Bearer ${nextToken ?? ''}`, enabled: true }, ...next]
    }

    updateHeaders(next)
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <Select
          value={type}
          size="small"
          variant="standard"
          onChange={(e) => {
            const next = e.target.value as 'none' | 'basic' | 'bearer'
            setType(next)
            applyAuth(next)
          }}
        >
          <MenuItem value="none">{t('request.auth.none')}</MenuItem>
          <MenuItem value="basic">{t('request.auth.basic')}</MenuItem>
          <MenuItem value="bearer">{t('request.auth.bearer')}</MenuItem>
        </Select>
      </FormControl>

      {type === 'basic' && (
        <Box sx={{ pl: 0, display: 'flex', gap: 1, flexDirection: 'column' }}>
          <TextField
            size="small"
            placeholder={t('request.auth.username')}
            value={username}
            onChange={(e) => {
              setUsername(e.target.value)
              applyAuth('basic', e.target.value, password)
            }}
          />
          <TextField
            size="small"
            placeholder={t('request.auth.password')}
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              applyAuth('basic', username, e.target.value)
            }}
          />
        </Box>
      )}

      {type === 'bearer' && (
        <Box sx={{ pl: 0 }}>
          <TextField
            size="small"
            fullWidth
            placeholder={t('request.auth.token')}
            value={token}
            onChange={(e) => {
              setToken(e.target.value)
              applyAuth('bearer', undefined, undefined, e.target.value)
            }}
          />
        </Box>
      )}
    </Box>
  )
}
