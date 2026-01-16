import { useMemo } from 'react'
import { Box } from '@mui/material'
import RawEditor from '@renderer/components/common/RawEditor'
import { HTTPResponse } from '@renderer/types/response'

type BodyViewerProps = {
  response: HTTPResponse | null
}

export default function BodyViewer({ response }: BodyViewerProps): React.ReactElement {
  const contentType = response?.headers?.['content-type'] || ''
  const language = useMemo(() => {
    if (contentType.includes('json')) {
      return 'json'
    } else if (contentType.includes('html')) {
      return 'html'
    }

    return 'text'
  }, [contentType])
  const body = useMemo(() => {
    if (contentType.includes('json') && response?.body) {
      try {
        return JSON.stringify(JSON.parse(response.body), null, 2)
      } catch (e) {
        console.error('Failed to parse JSON body:', e)
      }
    }
    return response?.body || ''
  }, [response, contentType])

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <RawEditor language={language} body={body} readonly />
    </Box>
  )
}
