import React from 'react'
import { Box, Typography } from '@mui/material'
import ModeSelect from './ModeSelect'
import RawEditor from '@renderer/components/common/RawEditor'
import RawControls from './RawControls'

type BodyEditorProps = {
  body: string
  onChange: (s: string) => void
}

export default function BodyEditor({ body, onChange }: BodyEditorProps): React.ReactElement {
  const [mode, setMode] = React.useState<string>('raw')
  const [language, setLanguage] = React.useState<string>('json')

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider', display: 'flex', alignItems: 'center' }}>
        <ModeSelect mode={mode} onChange={setMode} />

        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1, mr: 1 }}>
          {mode === 'raw' && (
            <RawControls
              body={body}
              onChange={onChange}
              language={language}
              setLanguage={setLanguage}
            />
          )}
        </Box>
      </Box>

      <Box sx={{ flex: 1, p: 1, minHeight: 0 }}>
        {mode === 'raw' && <RawEditor body={body} onChange={onChange} language={language} />}

        {mode === 'none' && (
          <Box sx={{ p: 2 }}>
            <Typography variant="body2" color="text.secondary">
              No request body for this request.
            </Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}
