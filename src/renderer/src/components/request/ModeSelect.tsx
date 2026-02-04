import { Box, Select, MenuItem } from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'
import { useI18n } from '../../contexts/useI18n'

type ModeSelectProps = {
  mode: string
  onChange: (mode: string) => void
}

export default function ModeSelect({ mode, onChange }: ModeSelectProps): React.ReactElement {
  const { t } = useI18n()
  const handle = (ev: SelectChangeEvent<string>): void => {
    onChange(ev.target.value as string)
  }

  return (
    <Box sx={{ p: 1 }}>
      <Select size="small" value={mode} onChange={handle}>
        <MenuItem value="none">{t('request.mode.none')}</MenuItem>
        <MenuItem value="raw">{t('request.mode.raw')}</MenuItem>
        <MenuItem value="form">{t('request.mode.form')}</MenuItem>
        <MenuItem value="urlencoded">{t('request.mode.urlencoded')}</MenuItem>
        <MenuItem value="binary">{t('request.mode.binary')}</MenuItem>
      </Select>
    </Box>
  )
}
