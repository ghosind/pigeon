import React, { useEffect, useRef, useState } from 'react'
import { v4 as uuidv4 } from 'uuid'
import { Box, IconButton, List, Tooltip, useTheme, Paper, TextField } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useRequestManager } from '@renderer/contexts/useRequestManager'
import { useI18n } from '../../contexts/useI18n'
import {
  HTTPMethod,
  type RequestModel,
  type Collection,
  type CollectionFolder
} from '@shared/types'
import CollectionTree from './CollectionTree'
import PromptDialog from '../common/PromptDialog'

export default function CollectionPanel(): React.JSX.Element {
  const {
    collections,
    setCollections,
    addFolder,
    removeCollectionNode,
    addRequestToCollection,
    openRequest,
    renameCollectionNode,
    exportCollectionNode,
    searchCollections
  } = useRequestManager()
  const { t } = useI18n()
  const theme = useTheme()

  const [promptOpen, setPromptOpen] = useState(false)
  const [newFolderParent, setNewFolderParent] = useState<string | null>(null)

  const handleAdd = (): void => {
    setNewFolderParent(null)
    setPromptOpen(true)
  }

  const handlePromptClose = async (value: string | null): Promise<void> => {
    setPromptOpen(false)
    if (!value) return

    let targetCol = collections[0]

    // Auto-create a default collection if none exists
    if (!targetCol) {
      try {
        const res = await window.api?.createCollection('My Collection')
        if (res?.ok && res.data) {
          targetCol = res.data as Collection
          setCollections([targetCol])
        }
      } catch (err) {
        console.error('[CollectionPanel] Auto-create collection failed:', err)
        return
      }
    }

    addFolder(value, targetCol.id, newFolderParent || null)
    setNewFolderParent(null)
  }

  const [renameOpen, setRenameOpen] = useState(false)
  const [renameTarget, setRenameTarget] = useState<Collection | CollectionFolder | null>(null)
  const [search, setSearch] = useState('')
  const searchSeq = useRef(0)
  const searchKeyword = search.trim()
  const displayNodes = searchKeyword ? [] : collections

  useEffect(() => {
    const q = searchKeyword
    const seq = ++searchSeq.current
    if (!q) return

    const timer = window.setTimeout(async () => {
      try {
        await searchCollections(q)
        if (seq === searchSeq.current) {
          // searchCollections updates state internally
        }
      } catch (err) {
        console.error('[CollectionPanel] Search failed:', err)
      }
    }, 300)

    return () => window.clearTimeout(timer)
  }, [searchKeyword, searchCollections])

  const handleAddRequestTo = async (parentId: string | null): Promise<void> => {
    const now = new Date().toISOString()
    const newReq: RequestModel = {
      id: uuidv4(),
      name: t('request.name.new'),
      method: HTTPMethod.GET,
      url: '',
      starred: false,
      sort: 0,
      deleted: false,
      createTime: now,
      updateTime: now
    }

    let targetCol = collections[0]

    // Auto-create a default collection if none exists
    if (!targetCol) {
      try {
        const res = await window.api?.createCollection('My Collection')
        if (res?.ok && res.data) {
          targetCol = res.data as Collection
          setCollections([targetCol])
        }
      } catch (err) {
        console.error('[CollectionPanel] Auto-create collection failed:', err)
        return
      }
    }

    addRequestToCollection(newReq, targetCol.id, parentId || null)
  }

  const handleEditNode = (node: Collection | CollectionFolder): void => {
    setRenameTarget(node)
    setRenameOpen(true)
  }

  const handleAddFolderFromMenu = (_collectionId: string, parentId?: string | null): void => {
    setNewFolderParent(parentId || null)
    setPromptOpen(true)
  }

  const handleExportNode = (id: string): void => {
    exportCollectionNode(id)
  }

  const handleRenameClose = (value: string | null): void => {
    setRenameOpen(false)
    if (!value || !renameTarget) return
    renameCollectionNode(renameTarget.id, value)
    setRenameTarget(null)
  }

  const handleOpen = (req: RequestModel): void => {
    openRequest(req)
  }

  const handleRemove = (id: string): void => {
    removeCollectionNode(id)
  }

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
          <Box sx={{ flex: 1, mr: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder={t('collection.panel.search')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </Box>
          <Tooltip title={t('collection.newFolder')}>
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
            nodes={displayNodes || []}
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
          defaultValue={renameTarget?.name || ''}
          onClose={handleRenameClose}
        />
      </Paper>
    </Box>
  )
}
