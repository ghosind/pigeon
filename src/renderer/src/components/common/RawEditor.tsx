import React, { useEffect } from 'react'
import { Box } from '@mui/material'
import { useTheme } from '@mui/material/styles'
import Editor from '@monaco-editor/react'
import loader from '@monaco-editor/loader'
import * as monaco from 'monaco-editor'

loader.config({ monaco })

type RawEditorProps = {
  language?: string
  body: string
  onChange?: (s: string) => void
  readonly?: boolean
}

export default function RawEditor({
  language,
  body,
  onChange,
  readonly
}: RawEditorProps): React.ReactElement {
  const theme = useTheme()

  useEffect(() => {
    const t = theme.palette.mode === 'dark' ? 'vs-dark' : 'vs'
    try {
      monaco.editor.setTheme(t)
    } catch (err) {
      console.error('Failed to set Monaco theme:', err)
    }
  }, [theme.palette.mode])

  const handleChange = (value: string | undefined): void => {
    if (onChange) {
      onChange(value ?? '')
    }
  }

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <Editor
        height="100%"
        width="100%"
        language={language ?? 'text'}
        theme={theme.palette.mode === 'dark' ? 'vs-dark' : 'vs'}
        value={body}
        onChange={handleChange}
        options={{
          readOnly: readonly ?? false,
          lineNumbers: 'on',
          roundedSelection: false,
          scrollBeyondLastLine: false,
          minimap: { enabled: false },
          wordWrap: 'on',
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, "Roboto Mono", monospace',
          fontSize: 13,
          lineHeight: 20,
          automaticLayout: true,
          renderLineHighlight: 'line',
          folding: true,
          foldingStrategy: 'auto',
          showFoldingControls: 'always'
        }}
      />
    </Box>
  )
}
