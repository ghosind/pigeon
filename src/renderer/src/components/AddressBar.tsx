import { useState } from 'react'
import {
  Box, TextField, Select, MenuItem, Button, FormControl, InputLabel,
} from '@mui/material'
import SendIcon from '@mui/icons-material/Send'
import { HttpMethod, HttpRequest } from '@renderer/types/request'

type AddressBarProps = {
  request: HttpRequest
  onChange: (request: HttpRequest) => void
  onSend: () => void
}

export default function AddressBar({
  request, onChange, onSend,
}: AddressBarProps) {
  const [isErr, setIsErr] = useState(false)

  const handleChange = (value: Partial<HttpRequest>) => {
    onChange({ ...request, ...value })
  }

  const handleSend = () => {
    try {
      new URL(request.url || '')
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
        onChange={(e) => handleChange({ url: e.target.value })}
        placeholder="Enter URL or paste text"
      />

      <Button
        variant="contained"
        color="primary"
        endIcon={<SendIcon />}
        onClick={() => handleSend()}
      >
        Send
      </Button>
    </Box>
  )
}
