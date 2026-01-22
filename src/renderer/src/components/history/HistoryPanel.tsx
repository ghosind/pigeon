import React from 'react'
import { Box, List, ListItemButton, ListItemText, useTheme, Paper } from '@mui/material'
import { useRequestManager } from '@renderer/contexts/useRequestManager'

export default function HistoryPanel(): React.JSX.Element {
  const { history, openRequest } = useRequestManager()
  const theme = useTheme()

  return (
    <Box
      sx={{
        background: theme.palette.background.default,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0
      }}
    >
      <Paper
        elevation={1}
        sx={{
          p: 1,
          flex: 1,
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        <Box sx={{ mb: 1, fontWeight: 600 }}>History</Box>
        <List sx={{ flex: 1, overflow: 'auto' }}>
          {history.map((h) => (
            <ListItemButton
              key={h.id}
              onClick={() => openRequest(h.request, { newTab: true })}
              sx={{ '&:hover': { bgcolor: theme.palette.action.hover } }}
            >
              <ListItemText
                primary={`${h.request.method} ${h.request.url}`}
                secondary={new Date(h.ts).toLocaleString()}
              />
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Box>
  )
}
