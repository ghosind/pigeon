import React from 'react'
import { Box, Tabs, Tab, Typography, Divider, Chip } from '@mui/material'

function TabPanel({ children, value, index }: any) {
  return (
    <div role="tabpanel" hidden={value !== index} style={{ height: '100%' }}>
      {value === index && <Box sx={{ p: 1 }}>{children}</Box>}
    </div>
  )
}

export default function ResponsePanel({ response }: { response: any }) {
  const [tab, setTab] = React.useState(0)

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', width: '100%' }}>
      <Box sx={{ mb: 1 }}>
        <Typography variant="subtitle1">Response</Typography>
        <Divider />
      </Box>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 1 }}>
        <Typography variant="body2">Status:</Typography>
        {response ? (
          <Chip label={`${response.status} ${response.statusText}`} color={response.status >= 400 ? 'error' : 'success'} size="small" />
        ) : (
          <Chip label="—" size="small" />
        )}
      </Box>

      <Tabs value={tab} onChange={(_, v) => setTab(v)}>
        <Tab label="Body" />
        <Tab label="Headers" />
      </Tabs>

      <Box sx={{ flex: 1, overflow: 'auto', mt: 1 }}>
        <TabPanel value={tab} index={0}>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: 'Menlo, monospace', fontSize: 13, margin: 0 }}>{response?.body ?? ''}</pre>
        </TabPanel>
        <TabPanel value={tab} index={1}>
          {response?.headers ? (
            Object.entries(response.headers as Record<string, string>).map(([k, v]) => (
              <Box key={k} sx={{ display: 'flex', gap: 1 }}>
                <Typography variant="caption" sx={{ minWidth: 140 }}>{k}:</Typography>
                <Typography variant="body2">{String(v)}</Typography>
              </Box>
            ))
          ) : (
            <Typography variant="body2">—</Typography>
          )}
        </TabPanel>
      </Box>
    </Box>
  )
}
