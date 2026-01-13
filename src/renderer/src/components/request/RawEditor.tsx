import { Box, TextField } from '@mui/material'

type RawEditorProps = {
  body: string
  onChange: (s: string) => void
}

export default function RawEditor({ body, onChange }: RawEditorProps): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ flex: 1 }}>
        <TextField
          multiline
          fullWidth
          minRows={1}
          maxRows={1}
          value={body}
          onChange={(e) => onChange(e.target.value)}
          sx={{
            height: '100%',
            '& .MuiInputBase-root': {
              height: '100%'
            },
            '& textarea': {
              height: '100% !important',
              overflow: 'auto'
            },
            fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace'
          }}
        />
      </Box>
    </Box>
  )
}
