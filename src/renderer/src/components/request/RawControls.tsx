import { Box, Button, Select, MenuItem } from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'
import { useI18n } from '../../contexts/useI18n'
import { RawType } from '@shared/types'

type RawControlsProps = {
  body: string
  onChange: (s: string) => void
  language: RawType
  setLanguage: (s: RawType) => void
}

export default function RawControls({
  body,
  onChange,
  language,
  setLanguage
}: RawControlsProps): React.ReactElement {
  const { t } = useI18n()
  const prettify = (src = body): string => {
    if (!src || language !== RawType.JSON) return src
    try {
      const j = JSON.parse(src)
      return JSON.stringify(j, null, 2)
    } catch (e) {
      console.error('[RawControls] Failed to format JSON:', e)
      return src
    }
  }

  const handleLanguageChange = (ev: SelectChangeEvent<string>): void => {
    setLanguage(ev.target.value as RawType)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
      <Select
        size="small"
        variant="standard"
        sx={{ ml: 2, minWidth: 100 }}
        value={language}
        onChange={handleLanguageChange}
      >
        <MenuItem value="json">{t('request.raw.json')}</MenuItem>
        <MenuItem value="xml">{t('request.raw.xml')}</MenuItem>
        <MenuItem value="text">{t('request.raw.text')}</MenuItem>
      </Select>

      <Button size="small" onClick={() => onChange(prettify())}>
        {t('request.raw.prettify')}
      </Button>
    </Box>
  )
}
