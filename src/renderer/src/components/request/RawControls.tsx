import { Box, Button, Select, MenuItem } from '@mui/material'
import { SelectChangeEvent } from '@mui/material/Select'

type RawControlsProps = {
  body: string
  onChange: (s: string) => void
  language: string
  setLanguage: (s: string) => void
}

export default function RawControls({ body, onChange, language, setLanguage }: RawControlsProps) {
  const prettify = (src = body) => {
    if (!src || language !== 'JSON') {
      return src
    }

    try {
      const j = JSON.parse(src)
      return JSON.stringify(j, null, 2)
    } catch (e) {
      console.error('Failed to format JSON:', e)
      return src
    }
  }

  const handleLanguageChange = (ev: SelectChangeEvent<string>) => {
    setLanguage(ev.target.value as string)
  }

  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
      <Select size="small" value={language} onChange={handleLanguageChange}>
        <MenuItem value="JSON">JSON</MenuItem>
        <MenuItem value="Text">Text</MenuItem>
        <MenuItem value="XML">XML</MenuItem>
        <MenuItem value="JavaScript">JavaScript</MenuItem>
      </Select>

      <Button size="small" onClick={() => onChange(prettify())}>
        Prettify
      </Button>
    </Box>
  )
}
