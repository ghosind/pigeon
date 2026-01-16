import { useMemo } from 'react'
import { Box } from '@mui/material'
import RawEditor from '@renderer/components/common/RawEditor'
import { HTTPResponse } from '@renderer/types/response'

type BodyViewerProps = {
  response: HTTPResponse | null
}

export default function BodyViewer({ response }: BodyViewerProps): React.ReactElement {
  const contentType = response?.headers?.['content-type'] || ''
  let language = useMemo(() => {
    if (contentType.includes('json')) {
      return 'json'
    } else if (contentType.includes('html')) {
      return 'html'
    }

    return 'text'
  }, [contentType])
  let body = useMemo(() => {
    switch (language) {
      case 'json':
        try {
          const j = JSON.parse(response?.body || '')
          return JSON.stringify(j, null, 2)
        } catch (e) {
          console.error('Failed to parse JSON body:', e)
          return response?.body || ''
        }
      default:
        return response?.body || ''
    }
  }, [response?.body, language])

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <RawEditor
        language={language}
        body={body}
        readonly
      />
    </Box>
  )
}
