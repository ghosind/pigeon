/**
 * ToolSideBar — multi-tab panel with collapsible sidebar.
 *
 * Tabs: Code Snippet (extensible for future tabs).
 * Collapse state is persisted to localStorage.
 */

import React, { useState, useCallback, useEffect } from 'react'
import {
  Box,
  Paper,
  Typography,
  Select,
  MenuItem,
  FormControl,
  IconButton,
  Tooltip,
  Tabs,
  Tab,
  useTheme
} from '@mui/material'
import ContentCopyIcon from '@mui/icons-material/ContentCopy'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import CodeIcon from '@mui/icons-material/Code'
import { useI18n } from '@renderer/contexts/useI18n'
import { generateSnippet, type SnippetLanguage } from '@renderer/utils/codeSnippet'
import type { RequestModel } from '@shared/types'

interface ToolSideBarProps {
  request: RequestModel | null
}

const LANGUAGES: { key: SnippetLanguage; labelKey: string }[] = [
  { key: 'curl', labelKey: 'snippet.curl' },
  { key: 'javascriptFetch', labelKey: 'snippet.javascriptFetch' },
  { key: 'javascriptAxios', labelKey: 'snippet.javascriptAxios' }
]

const STORAGE_KEY = 'pigeon:rightSidebarCollapsed'

function getTabs(t: (key: string) => string): {
  id: string
  aria: string
  icon: React.ReactElement
  content: (props: { request: RequestModel | null }) => React.ReactElement
}[] {
  return [
    {
      id: 'snippets',
      aria: t('snippet.title'),
      icon: <CodeIcon />,
      content: SnippetTabContent
    }
  ]
}

function SnippetTabContent({ request }: { request: RequestModel | null }): React.JSX.Element {
  const { t } = useI18n()
  const theme = useTheme()
  const [language, setLanguage] = useState<SnippetLanguage>('curl')

  const handleCopy = useCallback(() => {
    if (!request) return
    const snippet = generateSnippet(
      {
        method: request.method,
        url: request.url,
        headers: request.headers?.reduce<Record<string, string>>((acc, h) => {
          if (h.key && h.enabled) acc[h.key] = h.value
          return acc
        }, {}),
        body: request.body?.rawContent
      },
      language
    )
    navigator.clipboard.writeText(snippet).catch(() => {})
  }, [request, language])

  const snippet = request
    ? generateSnippet(
        {
          method: request.method,
          url: request.url,
          headers: request.headers?.reduce<Record<string, string>>((acc, h) => {
            if (h.key && h.enabled) acc[h.key] = h.value
            return acc
          }, {}),
          body: request.body?.rawContent
        },
        language
      )
    : ''

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Language selector + copy button on same row */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          px: 1.5,
          py: 1,
          borderBottom: `1px solid ${theme.palette.divider}`
        }}
      >
        <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
          <Select
            value={language}
            onChange={(e) => setLanguage(e.target.value as SnippetLanguage)}
            displayEmpty
          >
            {LANGUAGES.map(({ key, labelKey }) => (
              <MenuItem key={key} value={key}>
                {t(labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Tooltip title={t('snippet.copy')}>
          <span>
            <IconButton size="small" onClick={handleCopy} disabled={!request}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Box>

      {/* Snippet content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1.5, minHeight: 0 }}>
        {request ? (
          <Paper
            variant="outlined"
            sx={{
              p: 1.5,
              fontFamily: 'monospace',
              fontSize: '0.8rem',
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              background: theme.palette.background.default,
              minHeight: '100%'
            }}
          >
            {snippet}
          </Paper>
        ) : (
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mt: 4 }}>
            {t('common.noRequest')}
          </Typography>
        )}
      </Box>
    </Box>
  )
}

export default function ToolSideBar({ request }: ToolSideBarProps): React.JSX.Element {
  const [tab, setTab] = useState(0)
  const theme = useTheme()
  const { t } = useI18n()
  const TABS = getTabs(t)
  const leftBg = theme.palette.background.paper
  const divider = theme.palette.divider
  const iconColor = theme.palette.text.secondary
  const selectedBg = theme.palette.action.selected

  const [collapsed, setCollapsed] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === '1'
    } catch {
      return false
    }
  })

  // Persist collapse state to localStorage on every change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch {
      /* ignore */
    }
  }, [collapsed])

  const toggleCollapse = useCallback(() => {
    setCollapsed((prev) => !prev)
  }, [])

  return (
    <Box
      sx={{
        width: collapsed ? 48 : 280,
        minWidth: collapsed ? 48 : 280,
        height: '100%',
        display: 'flex',
        flexDirection: 'row',
        borderLeft: `1px solid ${divider}`,
        background: leftBg,
        transition: 'width 0.2s ease'
      }}
    >
      {/* Icon strip (always visible) */}
      <Box
        sx={{
          width: 48,
          borderRight: collapsed ? 'none' : `1px solid ${divider}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: 1,
          gap: 0.5,
          background: leftBg
        }}
      >
        <Tabs
          orientation="vertical"
          value={tab}
          onChange={(_, v) => {
            setTab(v)
            if (collapsed) setCollapsed(false)
          }}
          sx={{
            '& .MuiTabs-flexContainer': { alignItems: 'center' },
            '& .MuiTabs-indicator': { display: 'none' }
          }}
        >
          {TABS.map((tb, i) => (
            <Tab
              key={tb.id}
              icon={tb.icon}
              aria-label={tb.aria}
              onClick={() => {
                if (collapsed) {
                  setTab(i)
                  setCollapsed(false)
                } else {
                  if (tab === i) setCollapsed(true)
                  else setTab(i)
                }
              }}
              sx={{
                minWidth: 0,
                padding: 1,
                minHeight: 56,
                color: tab === i ? theme.palette.text.primary : iconColor,
                bgcolor: tab === i ? selectedBg : 'transparent',
                borderRadius: 1,
                '&:hover': { bgcolor: theme.palette.action.hover }
              }}
            />
          ))}
        </Tabs>

        {/* Collapse toggle at bottom */}
        <Box sx={{ flex: 1 }} />
        <Tooltip title={collapsed ? t('common.expand') : t('common.collapse')}>
          <IconButton size="small" onClick={toggleCollapse} sx={{ mb: 1 }}>
            {collapsed ? (
              <ChevronLeftIcon fontSize="small" />
            ) : (
              <ChevronRightIcon fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
      </Box>

      {/* Expanded panel content */}
      {!collapsed && (
        <Box
          sx={{
            width: 'calc(100% - 48px)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
        >
          <Box sx={{ flex: 1, overflow: 'auto', background: theme.palette.background.default }}>
            {React.createElement(TABS[tab]?.content, { request })}
          </Box>
        </Box>
      )}
    </Box>
  )
}
