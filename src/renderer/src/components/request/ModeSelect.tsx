import { Box, Select, MenuItem } from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'

type ModeSelectProps = {
  mode: string
  onChange: (mode: string) => void
}

export default function ModeSelect({ mode, onChange }: ModeSelectProps) {
  const handle = (ev: SelectChangeEvent<string>) => onChange(ev.target.value as string)

  return (
    <Box sx={{ p: 1 }}>
      <Select size="small" value={mode} onChange={handle}>
        <MenuItem value="none">None</MenuItem>
        <MenuItem value="raw">Raw</MenuItem>
      </Select>
    </Box>
  )
}
