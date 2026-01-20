import React, { useState } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import SettingsIcon from '@mui/icons-material/Settings'
import SettingsModal from './SettingsModal'

const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [open, setOpen] = useState(false)

  return (
    <Box sx={{ minHeight: '100vh' }}>
      <AppBar position="fixed" color="default" elevation={1} sx={{ height: 48 }}>
        <Toolbar variant="dense" sx={{ minHeight: 48, height: 48 }}>
          <Box sx={{ flex: 1 }} />
          <Tooltip title="Settings">
            <IconButton color="inherit" size="small" onClick={() => setOpen(true)}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Toolbar variant="dense" sx={{ minHeight: 48, height: 48 }} />

      <Box component="main" sx={{ height: 'calc(100vh - 48px)', width: '100%' }}>
        {children}
      </Box>

      <SettingsModal open={open} onClose={() => setOpen(false)} />
    </Box>
  )
}

export default Layout
