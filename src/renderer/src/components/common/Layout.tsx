/**
 * Layout — top-level app shell with sidebar, tab bar, and main content area.
 * Left-right request/response split layout matching Postman's design.
 */

import React, { useState, useEffect } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import SettingsIcon from '@mui/icons-material/Settings'
import { useI18n } from '../../contexts/useI18n'
import SettingsModal from './SettingsModal'
import Sidebar from './Sidebar'
import { RequestManagerProvider } from '@renderer/contexts/RequestManagerContext'
import { useRequestManager } from '@renderer/contexts/useRequestManager'
import { v4 as uuidv4 } from 'uuid'
import { HTTPMethod } from '@shared/types'

const LayoutInner: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [settingsOpen, setSettingsOpen] = useState(false)
  const { t } = useI18n()
  const requestManager = useRequestManager()

  // Register global keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent): void => {
      const mod = e.ctrlKey || e.metaKey
      if (!mod) return

      const k = e.key.toLowerCase()
      if (k === 't') {
        e.preventDefault()
        requestManager.openRequest(
          {
            id: uuidv4(),
            method: HTTPMethod.GET,
            url: '',
            name: '',
            starred: false,
            sort: 0,
            deleted: false,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString()
          },
          { newTab: true }
        )
      }

      if (k === 'w') {
        e.preventDefault()
        requestManager.closeCurrentTab?.()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestManager])

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Top navigation bar */}
      <AppBar position="fixed" color="default" elevation={1} sx={{ height: 48, zIndex: 1201 }}>
        <Toolbar variant="dense" sx={{ minHeight: 48, height: 48, gap: 1 }}>
          <Box sx={{ flex: 1 }} />
          <Tooltip title={t('layout.settings.tooltip')}>
            <IconButton color="inherit" size="small" onClick={() => setSettingsOpen(true)}>
              <SettingsIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Toolbar>
      </AppBar>

      <Toolbar variant="dense" sx={{ minHeight: 48, height: 48 }} />

      {/* Main layout: sidebar + content */}
      <Box
        component="main"
        sx={{
          height: 'calc(100vh - 48px)',
          width: '100%',
          display: 'flex',
          minWidth: 0
        }}
      >
        <Sidebar />
        <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          {children}
        </Box>
      </Box>

      <SettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </Box>
  )
}

const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  return (
    <RequestManagerProvider>
      <LayoutInner>{children}</LayoutInner>
    </RequestManagerProvider>
  )
}

export default Layout
