import { useMemo } from 'react'
import { Box } from '@mui/material'
import RawEditor from '@renderer/components/common/RawEditor'
import { HTTPResponse } from '@renderer/types/response'

type BodyViewerProps = {
  response: HTTPResponse | null
}

export default function BodyViewer({ response }: BodyViewerProps): React.ReactElement {
  const [body, language] = useMemo(() => {
    let lang = 'text'
    let b = response?.body || ''

    const contentType = response?.headers?.['content-type'] || ''
    if (contentType.includes('json')) {
      lang = 'json'
      try {
        b = JSON.stringify(JSON.parse(b), null, 2)
      } catch (e) {
        console.error('Failed to parse JSON body:', e)
      }
    } else if (contentType.includes('html')) {
      lang = 'html'
    }

    return [b, lang]
  }, [response])

  return (
    <Box sx={{ height: '100%', width: '100%' }}>
      <RawEditor language={language} body={body} readonly />
    </Box>
  )
}
