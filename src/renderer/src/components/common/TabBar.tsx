import React, { useState } from 'react'
import { Box, IconButton, Tooltip, Tabs, Tab, TextField, Menu, MenuItem } from '@mui/material'
import CloseIcon from '@mui/icons-material/Close'
import AddIcon from '@mui/icons-material/Add'
import ArrowDropDownIcon from '@mui/icons-material/ArrowDropDown'
import { useI18n } from '@renderer/contexts/useI18n'

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
  onRename?: (id: string, title: string) => void
  onReorder?: (fromId: string, toId: string) => void
}

export default function TabBar({
  tabs,
  activeId,
  onSelect,
  onClose,
  onAdd,
  onRename,
  onReorder
}: TabBarProps): React.JSX.Element {
  const { t } = useI18n()
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState<string>('')
  const [menuAnchor, setMenuAnchor] = useState<null | HTMLElement>(null)

  const startEdit = (id: string, title: string): void => {
    setEditingId(id)
    setEditTitle(title)
  }

  const commitEdit = (): void => {
    if (editingId && onRename) {
      onRename(editingId, editTitle.trim() || 'Untitled Request')
    }
    setEditingId(null)
    setEditTitle('')
  }

  const cancelEdit = (): void => {
    setEditingId(null)
    setEditTitle('')
  }

  const openMenu = (e: React.MouseEvent<HTMLElement>): void => {
    setMenuAnchor(e.currentTarget)
  }

  const closeMenu = (): void => {
    setMenuAnchor(null)
  }

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
              <Box
                sx={{ display: 'flex', alignItems: 'center', gap: 1 }}
                draggable={editingId === null}
                onDragStart={(e) => {
                  if (editingId) {
                    return
                  }
                  e.dataTransfer?.setData('text/plain', t.id)
                  if (e.dataTransfer) {
                    e.dataTransfer.effectAllowed = 'move'
                  }
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  if (e.dataTransfer) {
                    e.dataTransfer.dropEffect = 'move'
                  }
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  const fromId = e.dataTransfer?.getData('text/plain')
                  if (fromId && fromId !== t.id) {
                    onReorder?.(fromId, t.id)
                  }
                }}
              >
                {editingId === t.id ? (
                  <TextField
                    size="small"
                    value={editTitle}
                    autoFocus
                    onChange={(e) => setEditTitle(e.target.value)}
                    onBlur={commitEdit}
                    onKeyDown={(e) => {
                      switch (e.key) {
                        case 'Enter':
                          commitEdit()
                          break
                        case 'Escape':
                          cancelEdit()
                          break
                      }
                    }}
                    inputProps={{ style: { fontSize: 13 } }}
                  />
                ) : (
                  <Box
                    sx={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 1 }}
                    onDoubleClick={() => startEdit(t.id, t.title)}
                  >
                    <Box>{t.title}</Box>
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
                )}
              </Box>
            }
            sx={{ alignItems: 'center', py: 0.5 }}
          />
        ))}
      </Tabs>

      <Box sx={{ flex: 1 }} />
      <Tooltip title={t('tabbar.addTab')}>
        <IconButton size="small" onClick={onAdd} sx={{ mr: 1 }}>
          <AddIcon />
        </IconButton>
      </Tooltip>
      <IconButton
        size="small"
        onClick={openMenu}
        aria-haspopup="true"
        aria-controls={menuAnchor ? 'tabs-menu' : undefined}
      >
        <ArrowDropDownIcon />
      </IconButton>
      <Menu
        id="tabs-menu"
        anchorEl={menuAnchor}
        open={Boolean(menuAnchor)}
        onClose={closeMenu}
        keepMounted
      >
        {tabs.map((t) => (
          <MenuItem
            key={t.id}
            selected={t.id === activeId}
            onClick={() => {
              onSelect(t.id)
              closeMenu()
            }}
          >
            {t.title}
          </MenuItem>
        ))}
      </Menu>
    </Box>
  )
}
