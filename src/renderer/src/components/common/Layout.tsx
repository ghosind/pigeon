/**
 * Layout — top-level app shell with sidebar, tab bar, and main content area.
 * Left-right request/response split layout matching Postman's design.
 */

import React, { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import AppBar from '@mui/material/AppBar'
import Toolbar from '@mui/material/Toolbar'
import Box from '@mui/material/Box'
import Button from '@mui/material/Button'
import IconButton from '@mui/material/IconButton'
import Tooltip from '@mui/material/Tooltip'
import Menu from '@mui/material/Menu'
import MenuItem from '@mui/material/MenuItem'
import ListItemIcon from '@mui/material/ListItemIcon'
import ListItemText from '@mui/material/ListItemText'
import Divider from '@mui/material/Divider'
import HomeIcon from '@mui/icons-material/Home'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import AddIcon from '@mui/icons-material/Add'
import SettingsIcon from '@mui/icons-material/Settings'
import { useI18n } from '../../contexts/useI18n'
import SettingsModal from './SettingsModal'
import { RequestManagerProvider } from '@renderer/contexts/RequestManagerContext'
import { useRequestManager } from '@renderer/contexts/useRequestManager'
import { useWorkspaceStore, useAppSettingStore } from '@renderer/stores'
import { v4 as uuidv4 } from 'uuid'
import { HTTPMethod } from '@shared/types'

const LayoutInner: React.FC<React.PropsWithChildren> = ({ children }) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [workspaceMenuAnchor, setWorkspaceMenuAnchor] = useState<HTMLElement | null>(null)
  const { t } = useI18n()
  const requestManager = useRequestManager()
  const { workspaces } = useWorkspaceStore()
  const shortcuts = useAppSettingStore((s) => s.config.shortcuts)

  const isDashboard = location.pathname === '/'

  const handleGoHome = (): void => {
    void navigate('/')
  }
  const handleOpenWorkspace = (id: string): void => {
    setWorkspaceMenuAnchor(null)
    void navigate(`/workspace/${id}`)
  }

  // Register global keyboard shortcuts
  useEffect(() => {
    if (!shortcuts) return

    /** Parse a shortcut string like "Ctrl+T" into { ctrl: true, key: "t" }. */
    function parseShortcut(
      shortcut: string
    ): { ctrl: boolean; shift: boolean; alt: boolean; key: string } | null {
      const parts = shortcut.split('+')
      const result = { ctrl: false, shift: false, alt: false, key: '' }
      for (const p of parts) {
        const lp = p.toLowerCase()
        if (lp === 'ctrl') result.ctrl = true
        else if (lp === 'shift') result.shift = true
        else if (lp === 'alt') result.alt = true
        else result.key = lp
      }
      return result.key ? result : null
    }

    /** Check if a keyboard event matches a parsed shortcut. */
    function matchesShortcut(e: KeyboardEvent, parsed: ReturnType<typeof parseShortcut>): boolean {
      if (!parsed) return false
      const mod = e.ctrlKey || e.metaKey
      return (
        mod === parsed.ctrl &&
        e.shiftKey === parsed.shift &&
        e.altKey === parsed.alt &&
        e.key.toLowerCase() === parsed.key
      )
    }

    const onKeyDown = (e: KeyboardEvent): void => {
      // Create request
      if (matchesShortcut(e, parseShortcut(shortcuts.createRequest))) {
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
        return
      }

      // Close request
      if (matchesShortcut(e, parseShortcut(shortcuts.closeRequest))) {
        e.preventDefault()
        requestManager.closeCurrentTab?.()
        return
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestManager, shortcuts])

  return (
    <Box sx={{ minHeight: '100vh' }}>
      {/* Top navigation bar */}
      <AppBar position="fixed" color="default" elevation={1} sx={{ height: 48, zIndex: 1201 }}>
        <Toolbar variant="dense" sx={{ minHeight: 48, height: 48, gap: 1 }}>
          {/* Home */}
          <Button
            color="inherit"
            size="small"
            startIcon={<HomeIcon fontSize="small" />}
            onClick={handleGoHome}
            sx={{
              textTransform: 'none',
              fontWeight: isDashboard ? 700 : 400,
              borderBottom: isDashboard ? 2 : 0,
              borderColor: 'primary.main',
              borderRadius: 0,
              height: 48
            }}
          >
            {t('layout.nav.home')}
          </Button>

          {/* Workspace dropdown */}
          <Button
            color="inherit"
            size="small"
            endIcon={<ArrowDropDownIcon fontSize="small" />}
            onClick={(e) => setWorkspaceMenuAnchor(e.currentTarget)}
            sx={{
              textTransform: 'none',
              fontWeight: !isDashboard ? 700 : 400,
              borderBottom: !isDashboard ? 2 : 0,
              borderColor: 'primary.main',
              borderRadius: 0,
              height: 48
            }}
          >
            {t('layout.nav.workspace')}
          </Button>

          <Menu
            anchorEl={workspaceMenuAnchor}
            open={Boolean(workspaceMenuAnchor)}
            onClose={() => setWorkspaceMenuAnchor(null)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
            slotProps={{ paper: { sx: { minWidth: 220 } } }}
          >
            {workspaces.length === 0 ? (
              <MenuItem disabled>
                <ListItemText primary={t('dashboard.empty')} />
              </MenuItem>
            ) : (
              workspaces.map((ws) => (
                <MenuItem
                  key={ws.id}
                  onClick={() => handleOpenWorkspace(ws.id)}
                  selected={location.pathname === `/workspace/${ws.id}`}
                >
                  <ListItemText
                    primary={ws.name}
                    secondary={ws.description || undefined}
                    primaryTypographyProps={{ fontSize: 13 }}
                    secondaryTypographyProps={{ fontSize: 11 }}
                  />
                </MenuItem>
              ))
            )}
            <Divider />
            <MenuItem
              onClick={() => {
                setWorkspaceMenuAnchor(null)
                navigate('/')
              }}
            >
              <ListItemIcon>
                <AddIcon fontSize="small" />
              </ListItemIcon>
              <ListItemText
                primary={t('dashboard.newWorkspace')}
                primaryTypographyProps={{ fontSize: 13 }}
              />
            </MenuItem>
          </Menu>

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
