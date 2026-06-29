import { useCallback, useEffect, useState } from 'react'
import { Box, TextField, Select, MenuItem, Button, FormControl } from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import CancelIcon from '@mui/icons-material/Cancel'
import SaveIcon from '@mui/icons-material/Save'
import SaveToCollectionModal from '@renderer/components/collection/SaveToCollectionModal'
import { useI18n } from '../../contexts/useI18n'
import { HTTPMethod, type RequestModel, type KeyValuePair } from '@shared/types'

type AddressBarProps = {
  request: RequestModel
  onChange: (request: RequestModel) => void
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
  const [saveOpen, setSaveOpen] = useState(false)

  const handleMethodChange = (method: HTTPMethod): void => {
    onChange({ ...request, method })
  }

  const handleURLChange = (url: string): void => {
    const params: KeyValuePair[] = []
    try {
      const parsed = new URL(url, url.startsWith('http') ? undefined : 'http://localhost')
      parsed.searchParams.forEach((v, k) => {
        params.push({ key: k, value: v, enabled: true })
      })
    } catch {
      // preserve existing params on parse failure
      onChange({ ...request, url })
      return
    }
    onChange({ ...request, url, params })
  }

  const handleSend = useCallback((): void => {
    if (!request.url.trim()) {
      setIsErr(true)
      return
    }
    setIsErr(false)
    onSend()
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
          onChange={(e) => handleMethodChange(e.target.value as HTTPMethod)}
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
      <Button variant="outlined" startIcon={<SaveIcon />} onClick={() => setSaveOpen(true)}>
        {t('action.save')}
      </Button>

      <SaveToCollectionModal
        open={saveOpen}
        onClose={() => setSaveOpen(false)}
        request={request}
        onSaved={(r) => onChange(r)}
      />
    </Box>
  )
}
