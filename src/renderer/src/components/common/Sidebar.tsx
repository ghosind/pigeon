import React from 'react'
import Box from '@mui/material/Box'
import Tabs from '@mui/material/Tabs'
import Tab from '@mui/material/Tab'
import { useTheme } from '@mui/material/styles'
import CollectionPanel from '@renderer/components/collection/CollectionPanel'
import HistoryPanel from '@renderer/components/history/HistoryPanel'
import CollectionsIcon from '@mui/icons-material/CollectionsBookmark'
import HistoryIcon from '@mui/icons-material/History'

const TABS: {
  id: string
  aria: string
  icon: React.ReactElement
  content: React.ReactElement
}[] = [
  {
    id: 'collections',
    aria: 'collections',
    icon: <CollectionsIcon />,
    content: <CollectionPanel />
  },
  {
    id: 'history',
    aria: 'history',
    icon: <HistoryIcon />,
    content: <HistoryPanel />
  }
]

export default function Sidebar(): React.JSX.Element {
  const [tab, setTab] = React.useState(0)
  const theme = useTheme()
  const leftBg = theme.palette.background.paper
  const divider = theme.palette.divider
  const iconColor = theme.palette.text.secondary
  const selectedBg = theme.palette.action.selected
  const STORAGE_KEY = 'pigeon:sidebarCollapsed'
  const [collapsed, setCollapsed] = React.useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      return raw === '1'
    } catch {
      return false
    }
  })

  React.useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, collapsed ? '1' : '0')
    } catch (e) {
      console.error(e)
    }
  }, [collapsed])

  return (
    <Box
      sx={{
        width: collapsed ? 64 : 320,
        display: 'flex',
        flexDirection: 'row',
        background: leftBg
      }}
    >
      <Box
        sx={{
          width: 64,
          borderRight: `1px solid ${divider}`,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          pt: 1,
          background: leftBg
        }}
      >
        <Tabs
          orientation="vertical"
          value={tab}
          onChange={(_, v) => {
            setTab(v)
            setCollapsed(false)
          }}
          sx={{
            '& .MuiTabs-flexContainer': { alignItems: 'center' },
            '& .MuiTabs-indicator': { display: 'none' }
          }}
        >
          {TABS.map((t, i) => (
            <Tab
              key={t.id}
              icon={t.icon}
              aria-label={t.aria}
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
      </Box>

      {!collapsed && (
        <Box
          sx={{
            width: 'calc(100% - 64px)',
            display: 'flex',
            flexDirection: 'column',
            minHeight: 0
          }}
        >
          <Box sx={{ flex: 1, overflow: 'auto', background: theme.palette.background.default }}>
            {TABS[tab]?.content}
          </Box>
        </Box>
      )}
    </Box>
  )
}
