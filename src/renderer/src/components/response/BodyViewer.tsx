import { Box } from '@mui/material'
import { useMemo } from 'react'

type BodyViewerProps = {
  response: any
}

function makePretty(body: any) {
  if (!body && body !== '') return ''
  if (typeof body === 'string') {
    try {
      const parsed = JSON.parse(body)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return body
    }
  }
  return JSON.stringify(body, null, 2)
}

export default function BodyViewer({ response }: BodyViewerProps) {
  const prettyBody = useMemo(() => makePretty(response?.body), [response?.body])

  return (
    <Box sx={{ fontFamily: 'Menlo, monospace', fontSize: 13 }}>
      <pre
        style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', margin: 0 }}
      >
        {prettyBody || ''}
      </pre>
    </Box>
  )
}
