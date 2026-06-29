import React from 'react'
import { Box, FormControl, Select, MenuItem, TextField } from '@mui/material'
import { AuthType, type HTTPAuthorization, type RequestModel } from '@shared/types'
import { useI18n } from '../../contexts/useI18n'

type AuthorizationEditorProps = {
  request: RequestModel
  onChange: (auth: HTTPAuthorization) => void
}

export default function AuthorizationEditor({
  request,
  onChange
}: AuthorizationEditorProps): React.ReactElement {
  const { t } = useI18n()
  const auth = request.auth || { type: AuthType.None }

  const updateAuth = (partial: Partial<HTTPAuthorization>): void => {
    onChange({ ...auth, ...partial })
  }

  const authType = auth.type || AuthType.None

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
      <FormControl size="small" sx={{ minWidth: 220 }}>
        <Select
          value={authType}
          size="small"
          variant="standard"
          onChange={(e) => updateAuth({ type: e.target.value as AuthType })}
        >
          <MenuItem value={AuthType.None}>{t('request.auth.none')}</MenuItem>
          <MenuItem value={AuthType.Bearer}>{t('request.auth.bearer')}</MenuItem>
          <MenuItem value={AuthType.Basic}>{t('request.auth.basic')}</MenuItem>
        </Select>
      </FormControl>

      {authType === AuthType.Bearer && (
        <TextField
          label={t('request.auth.token')}
          size="small"
          value={auth.token || ''}
          onChange={(e) => updateAuth({ token: e.target.value })}
        />
      )}

      {authType === AuthType.Basic && (
        <>
          <TextField
            label={t('request.auth.username')}
            size="small"
            value={auth.username || ''}
            onChange={(e) => updateAuth({ username: e.target.value })}
          />
          <TextField
            label={t('request.auth.password')}
            size="small"
            type="password"
            value={auth.password || ''}
            onChange={(e) => updateAuth({ password: e.target.value })}
          />
        </>
      )}
    </Box>
  )
}
