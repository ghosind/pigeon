import { useCallback, useEffect, useState } from 'react'
import { Box, TextField, Select, MenuItem, Button, FormControl } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import CancelIcon from '@mui/icons-material/Cancel'
import { useI18n } from '../../contexts/useI18n'
import { KeyValuePair } from '@shared/types/kv'
import { HTTPMethod, HTTPRequest } from '@shared/types'
import { Url } from '@shared/utils/url'

type AddressBarProps = {
  request: HTTPRequest
  onChange: (request: HTTPRequest) => void
  onSend: () => void
  isLoading: boolean
  onCancel: () => void
}

export default function AddressBar({
  request,
  onChange,
  onSend,
  isLoading,
  onCancel
}: AddressBarProps): React.ReactElement {
  const { t } = useI18n()
  const [isErr, setIsErr] = useState(false)

  const handleChange = (value: Partial<HTTPRequest>): void => {
    onChange({ ...request, ...value })
  }

  const handleURLChange = (value: string): void => {
    const params: KeyValuePair[] = []
    const urlObj = new Url(value)
    urlObj.searchParams.forEach((v, k) => {
      params.push({ key: k, value: v, enabled: true })
    })

    onChange({ ...request, url: value, params })
  }

  const handleSend = useCallback((): void => {
    try {
      if (!request.url) throw new Error('Invalid URL')

      new Url(request.url || '')
      setIsErr(false)
      onSend()
    } catch (e) {
      console.error(e)
      setIsErr(true)
    }
  }, [request.url, onSend])

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        handleSend()
      }

      if (e.key === 'Escape') {
        e.preventDefault()
        onCancel()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [handleSend, onCancel])

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 110 }}>
        <Select
          value={request.method}
          onChange={(e) => handleChange({ method: e.target.value as HTTPMethod })}
          disabled={isLoading}
        >
          {Object.values(HTTPMethod).map((m) => (
            <MenuItem key={m} value={m}>
              {m}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size="small"
        fullWidth
        value={request.url}
        error={isErr}
        onChange={(e) => handleURLChange(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSend()
          }

          if (e.key === 'Escape') {
            e.preventDefault()
            onCancel()
          }
        }}
        disabled={isLoading}
        placeholder={t('addressbar.placeholder')}
      />

      {isLoading ? (
        <Button
          variant="contained"
          color="warning"
          endIcon={<CancelIcon />}
          onClick={() => onCancel()}
        >
          {t('action.cancel')}
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          endIcon={<SendIcon />}
          onClick={() => handleSend()}
        >
          {t('action.send')}
        </Button>
      )}
    </Box>
  )
}
