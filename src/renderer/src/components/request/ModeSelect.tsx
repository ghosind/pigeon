import { Box, Select, MenuItem } from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'
import { useI18n } from '../../contexts/useI18n'
import { BodyMode } from '@shared/types'

type ModeSelectProps = {
  mode: BodyMode
  onChange: (mode: BodyMode) => void
}

export default function ModeSelect({ mode, onChange }: ModeSelectProps): React.ReactElement {
  const { t } = useI18n()
  const handle = (ev: SelectChangeEvent<BodyMode>): void => {
    onChange(ev.target.value)
  }

  return (
    <Box sx={{ p: 1 }}>
      <Select size="small" value={mode} onChange={handle}>
        <MenuItem value={BodyMode.None}>{t('request.mode.none')}</MenuItem>
        <MenuItem value={BodyMode.Raw}>{t('request.mode.raw')}</MenuItem>
        <MenuItem value={BodyMode.FormData}>{t('request.mode.form')}</MenuItem>
        <MenuItem value={BodyMode.UrlEncoded}>{t('request.mode.urlencoded')}</MenuItem>
        <MenuItem value={BodyMode.Binary}>{t('request.mode.binary')}</MenuItem>
      </Select>
    </Box>
  )
}
