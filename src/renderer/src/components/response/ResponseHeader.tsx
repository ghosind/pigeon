import { Box, Typography, Chip, FormControl, Select, MenuItem } from '@mui/material'
import { HTTPResponse } from '@renderer/types/response'
import { formatSize } from '@shared/utils/unit'

type ResponseHeaderProps = {
  response: HTTPResponse | null
  panel: string
  setPanel: (p: string) => void
}

export default function ResponseHeader({
  response,
  panel,
  setPanel
}: ResponseHeaderProps): React.ReactElement | null {
  if (!response) {
    return null
  }

  const status = response ? response.status : null
  const statusText = response ? response.statusText : ''
  const timeMs = response?.duration
  const size =
    response?.size ?? (typeof response?.body === 'string' ? response.body.length : undefined)

  return (
    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1, flexWrap: 'wrap' }}>
      <FormControl size="small" sx={{ ml: 2, minWidth: 100 }} variant="standard">
        <Select value={panel} onChange={(e) => setPanel(e.target.value as string)}>
          <MenuItem value="body">Body</MenuItem>
          <MenuItem value="headers">Headers</MenuItem>
        </Select>
      </FormControl>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2">Status</Typography>
        <Chip
          label={`${status ?? ''} ${statusText ?? ''}`}
          color={status && status >= 400 ? 'error' : 'success'}
          size="small"
        />
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2">Time</Typography>
        <Typography variant="body2">{timeMs ? `${timeMs} ms` : '—'}</Typography>
      </Box>

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="body2">Size</Typography>
        <Typography variant="body2">{formatSize(size)}</Typography>
      </Box>
    </Box>
  )
}
