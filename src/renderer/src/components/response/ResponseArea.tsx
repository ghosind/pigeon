import React, { useState } from 'react'
import { Box } from '@mui/material'
import ResponseHeader from './ResponseHeader'
import BodyViewer from './BodyViewer'
import HeadersViewer from './HeadersViewer'
import { HTTPResponse } from '@shared/types'

type ResponseAreaProps = {
  response?: HTTPResponse
}

export default function ResponseArea({ response }: ResponseAreaProps): React.ReactElement | null {
  const [panel, setPanel] = useState<string>('body')
  const [language, setLanguage] = useState<string>('json')

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <ResponseHeader
        response={response}
        panel={panel}
        setPanel={setPanel}
        language={language}
        setLanguage={setLanguage}
      />

      {response && (
        <Box sx={{ flex: 1, p: 1, minHeight: 0 }}>
          {panel === 'body' && <BodyViewer response={response} language={language} />}
          {panel === 'headers' && <HeadersViewer response={response} />}
        </Box>
      )}
    </Box>
  )
}
