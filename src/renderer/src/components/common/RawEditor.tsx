import { Box } from '@mui/material'
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
