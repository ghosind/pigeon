import React from 'react'
import { Box, IconButton, Tooltip, Tabs, Tab } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'

type TabItem = {
  id: string
  title: string
}

type TabBarProps = {
  tabs: TabItem[]
  activeId: string | null
  onSelect: (id: string) => void
  onClose: (id: string) => void
  onAdd: () => void
}

export default function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onAdd
}: TabBarProps): React.JSX.Element {
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', bgcolor: 'background.paper' }}>
      <Tabs
        value={activeId}
        onChange={(_, value) => onSelect(String(value))}
        variant="scrollable"
        scrollButtons="auto"
        sx={{ minHeight: 40 }}
      >
        {tabs.map((t) => (
          <Tab
            key={t.id}
            value={t.id}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Box sx={{ fontSize: 13 }}>{t.title}</Box>
                <IconButton
                  size="small"
                  onClick={(e) => {
                    e.stopPropagation()
                    onClose(t.id)
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            }
            sx={{ alignItems: 'center', py: 0.5 }}
          />
        ))}
      </Tabs>

      <Box sx={{ flex: 1 }} />
      <Tooltip title="New Tab">
        <IconButton size="small" onClick={onAdd} sx={{ mr: 1 }}>
          <AddIcon />
        </IconButton>
      </Tooltip>
    </Box>
  )
}
