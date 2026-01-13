import { useState } from 'react'
import {
  Box, TextField, Select, MenuItem, Button, FormControl, InputLabel,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import CancelIcon from '@mui/icons-material/Cancel'
import { HttpMethod, HttpRequest, KeyValuePair } from '@renderer/types/request'
import { Url } from '@shared/utils/url'

type AddressBarProps = {
  request: HttpRequest
  onChange: (request: HttpRequest) => void
  onSend: () => void
  isLoading: boolean
  onCancel: () => void
}

export default function AddressBar({ request, onChange, onSend, isLoading, onCancel }: AddressBarProps) {
  const [isErr, setIsErr] = useState(false)

  const handleChange = (value: Partial<HttpRequest>) => {
    onChange({ ...request, ...value })
  }

  const handleURLChange = (value: string) => {
    const params: KeyValuePair[] = []
    const urlObj = new Url(value)
    urlObj.searchParams.forEach((v, k) => {
      params.push({ key: k, value: v, enabled: true })
    })

    onChange({ ...request, url: value, params })
  }

  const handleSend = () => {
    try {
      if (!request.url) throw new Error('Invalid URL')

      new Url(request.url || '')
      setIsErr(false)
      onSend()
    } catch (e) {
      setIsErr(true)
    }
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 110 }}>
        <InputLabel id="method-label">Method</InputLabel>
        <Select
          labelId="method-label"
          label="Method"
          value={request.method}
          onChange={(e) => handleChange({ method: e.target.value as HttpMethod })}
          disabled={isLoading}
        >
          {Object.values(HttpMethod).map((m) => (
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
        disabled={isLoading}
        placeholder="Enter URL or paste text"
      />

      {isLoading ? (
        <Button
          variant="contained"
          color="warning"
          endIcon={<CancelIcon />}
          onClick={() => onCancel()}
        >
          Cancel
        </Button>
      ) : (
        <Button
          variant="contained"
          color="primary"
          endIcon={<SendIcon />}
          onClick={() => handleSend()}
        >
          Send
        </Button>
      )}
    </Box>
  )
}
