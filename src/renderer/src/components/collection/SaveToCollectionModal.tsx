import React, { useState } from 'react'
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Radio,
  List,
  ListItemButton,
  ListItemText,
  Box,
  TextField,
  Stack
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import { useRequestManager } from '@renderer/contexts/useRequestManager'
import { Request, CollectionNode } from '@shared/types'
import useI18n from '@renderer/contexts/useI18n'

type SaveToCollectionModalProps = {
  open: boolean
  onClose: () => void
  request: Request
  onSaved?: (request: Request) => void
}

function renderFolderNodes(
  nodes: CollectionNode[],
  selected: string | null,
  setSelected: (id: string | null) => void,
  level = 0
): Array<React.ReactElement | null> {
  return nodes.map((n) => {
    if (n.type === 'folder') {
      return (
        <Box key={n.id} sx={{ pl: level * 2 }}>
          <ListItemButton onClick={() => setSelected(n.id)}>
            <Radio checked={selected === n.id} />
            <ListItemText primary={n.title} />
          </ListItemButton>
          {n.children && renderFolderNodes(n.children, selected, setSelected, level + 1)}
        </Box>
      )
    }

    return null
  })
}

export default function SaveToCollectionModal({
  open,
  onClose,
  request,
  onSaved
}: SaveToCollectionModalProps): React.ReactElement {
  const { collections, addRequestToFolder, addFolder } = useRequestManager()
  const [selected, setSelected] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const { t } = useI18n()

  const handleSave = (): void => {
    addRequestToFolder(selected, request)
    if (onSaved) {
      onSaved({ ...request, isInCollection: true })
    }
    onClose()
  }

  const handleCreateFolder = (): void => {
    if (!newFolderName.trim()) {
      return
    }
    addFolder(newFolderName.trim(), selected || null)
    setNewFolderName('')
  }

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{t('collection.savemodal.title')}</DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          <List>{renderFolderNodes(collections, selected, setSelected)}</List>

          <Box>
            <Stack direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                label={t('collection.newFolder')}
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
              />
              <Button startIcon={<AddIcon />} onClick={handleCreateFolder}>
                {t('action.create')}
              </Button>
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>{t('action.cancel')}</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          {t('action.save')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
