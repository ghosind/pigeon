import React, { useState, useEffect } from 'react'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import { useI18n } from '../../contexts/useI18n'
import SettingsIcon from '@mui/icons-material/Settings'
import SettingsModal from './SettingsModal'
import Sidebar from './Sidebar'
import { RequestManagerProvider } from '@renderer/contexts/RequestManagerContext'
import { useRequestManager } from '@renderer/contexts/useRequestManager'
import * as uuid from 'uuid'
import { Request, RequestType, HTTPMethod } from '@shared/types'

const Layout: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [open, setOpen] = useState(false)
  const { t } = useI18n()
  const Inner: React.FC<React.PropsWithChildren> = ({ children: innerChildren }) => {
    const requestManager = useRequestManager()

    useEffect(() => {
      const onKeyDown = (e: KeyboardEvent): void => {
        const mod = e.ctrlKey || e.metaKey
        if (!mod) {
          return
        }

        const k = e.key.toLowerCase()
        switch (k) {
          case 't': {
            const id = uuid.v4()
            const newReq: Request = {
              id,
              request: { method: HTTPMethod.GET, url: '' },
              type: RequestType.HTTP
            }
            requestManager.openRequest(newReq, { newTab: true })
            break
          }
          case 'w': {
            e.preventDefault()
            requestManager.closeCurrent && requestManager.closeCurrent()
            break
          }
          default:
        }
      }

      window.addEventListener('keydown', onKeyDown)
      return () => window.removeEventListener('keydown', onKeyDown)
    }, [requestManager])

    return (
      <Box sx={{ minHeight: '100vh' }}>
        <AppBar position="fixed" color="default" elevation={1} sx={{ height: 48 }}>
          <Toolbar variant="dense" sx={{ minHeight: 48, height: 48 }}>
            <Box sx={{ flex: 1 }} />
            <Tooltip title={t('layout.settings.tooltip')}>
              <IconButton color="inherit" size="small" onClick={() => setOpen(true)}>
                <SettingsIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Toolbar variant="dense" sx={{ minHeight: 48, height: 48 }} />

        <Box
          component="main"
          sx={{ height: 'calc(100vh - 48px)', width: '100%', display: 'flex', minWidth: 0 }}
        >
          <Sidebar />
          <Box sx={{ flex: 1, minHeight: 0, minWidth: 0 }}>{innerChildren}</Box>
        </Box>

        <SettingsModal open={open} onClose={() => setOpen(false)} />
      </Box>
    )
  }

  return (
    <RequestManagerProvider>
      <Inner>{children}</Inner>
    </RequestManagerProvider>
  )
}

export default Layout
