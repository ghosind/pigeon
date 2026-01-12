import { Box, TextField, Button } from '@mui/material'

type BodyEditorProps = {
  body: string
  onChange: (s: string) => void
}

export default function BodyEditor({ body, onChange }: BodyEditorProps) {
  const tryFormatJson = () => {
    try {
      const j = JSON.parse(body)
      onChange(JSON.stringify(j, null, 2))
    } catch (e) {
      console.error('Failed to format JSON:', e)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ mb: 1 }}>
        <Button size="small" onClick={tryFormatJson}>
          Prettify JSON
        </Button>
      </Box>
      <TextField
        multiline
        minRows={12}
        maxRows={40}
        fullWidth
        value={body}
        onChange={(e) => onChange(e.target.value)}
        sx={{ flex: 1 }}
        placeholder="Request body"
      />
    </Box>
  )
}
