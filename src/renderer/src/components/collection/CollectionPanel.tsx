import React, { useState } from 'react'
import { Box, IconButton, List, Tooltip, useTheme, Paper } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useRequestManager } from '@renderer/contexts/useRequestManager'
import { useI18n } from '../../contexts/useI18n'
import { HTTPMethod, Request, RequestType, CollectionNode } from '@shared/types'
import CollectionTree from './CollectionTree'
import PromptDialog from '../common/PromptDialog'
import * as uuid from 'uuid'

export default function CollectionPanel(): React.JSX.Element {
  const {
    collections,
    addFolder,
    removeNode,
    addRequestToFolder,
    openRequest,
    renameNode,
    exportNode
  } = useRequestManager()
  const { t } = useI18n()
  const theme = useTheme()

  const [promptOpen, setPromptOpen] = useState(false)
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null)

  const handleAdd = (): void => {
    setNewFolderParent(null)
    setPromptOpen(true)
  }

  const handlePromptClose = (value: string | null): void => {
    setPromptOpen(false)
    if (!value) return
    addFolder(value, newFolderParent || null)
    setNewFolderParent(null)
  }

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<CollectionNode | null>(null)

  const handleAddRequestTo = (parentId: string | null): void => {
    const newReq: Request = {
      type: RequestType.HTTP,
      id: uuid.v4(),
      title: 'New Request',
      isTitled: true,
      request: { method: HTTPMethod.GET, url: '' }
    }
    addRequestToFolder(parentId, newReq)
    openRequest(newReq)
  }

  const handleEditNode = (node: CollectionNode): void => {
    setRenameTarget(node)
    setRenameOpen(true)
  }

  const handleAddFolderFromMenu = (parentId: string | null): void => {
    setNewFolderParent(parentId || null)
    setPromptOpen(true)
  }

  const handleExportNode = (id: string): void => {
    exportNode(id)
  }

  const handleRenameClose = (value: string | null): void => {
    setRenameOpen(false)
    if (!value || !renameTarget) return
    renameNode(renameTarget.id, value)
    setRenameTarget(null)
  }

  const handleOpen = (req: Request): void => openRequest(req)

  const handleRemove = (id: string): void => removeNode(id)

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
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
          <Box sx={{ fontWeight: 600 }}>{t('collection.panel.collections')}</Box>
          <Tooltip title={t('collection.panel.newFolder')}>
            <IconButton size="small" onClick={handleAdd}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <PromptDialog
          open={promptOpen}
          title={t('collection.prompt.name')}
          onClose={handlePromptClose}
        />

        <List sx={{ flex: 1, overflow: 'auto', background: 'transparent' }}>
          <CollectionTree
            nodes={collections || []}
            onOpenRequest={handleOpen}
            onRemove={handleRemove}
            onAddRequest={handleAddRequestTo}
            onEdit={handleEditNode}
            onAddFolder={handleAddFolderFromMenu}
            onExport={handleExportNode}
          />
        </List>
        <PromptDialog
          open={renameOpen}
          title={t('collection.prompt.rename')}
          defaultValue={
            renameTarget?.type === 'folder' ? renameTarget.title : renameTarget?.request?.title
          }
          onClose={handleRenameClose}
        />
      </Paper>
    </Box>
  )
}
