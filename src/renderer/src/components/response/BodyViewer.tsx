import { useMemo } from 'react'
import { Box } from '@mui/material'
import RawEditor from '@renderer/components/common/RawEditor'
import { HTTPResponse } from '@shared/types'

type BodyViewerProps = {
  response?: HTTPResponse
  language?: string
}

export default function BodyViewer({ response, language }: BodyViewerProps): React.ReactElement {
  const body = useMemo(() => {
    if (!response?.body) {
      return ''
    }

    if (language === 'json') {
      try {
        return JSON.stringify(JSON.parse(response.body), null, 2)
      } catch (e) {
        console.error('Failed to parse JSON body:', e)
        return response.body
      }
    }

    return response.body
  }, [response, language])

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <RawEditor language={language} body={body} readonly />
    </Box>
  )
}
