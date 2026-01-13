import React from 'react'
import { Box, Typography, Divider } from '@mui/material'
import ResponseHeader from './ResponseHeader'
import BodyViewer from './BodyViewer'
import HeadersViewer from './HeadersViewer'
import { HTTPResponse } from '@renderer/types/response'

type ResponseAreaProps = {
  response: HTTPResponse | null
}

export default function ResponseArea({ response }: ResponseAreaProps): React.ReactElement | null {
  const [panel, setPanel] = React.useState<string>('body')

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle1">Response</Typography>
        <Divider />
      </Box>

      <ResponseHeader response={response} panel={panel} setPanel={setPanel} />

      <Box sx={{ flex: 1, overflow: 'auto', mt: 1 }}>
        {panel === 'body' && <BodyViewer response={response} />}
        {panel === 'headers' && <HeadersViewer response={response} />}
      </Box>
    </Box>
  )
}
