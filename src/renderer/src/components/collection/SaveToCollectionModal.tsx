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
import type { RequestModel, Collection } from '@shared/types'
import useI18n from '@renderer/contexts/useI18n'

type SaveToCollectionModalProps = {
  open: boolean
  onClose: () => void
  request: RequestModel
  onSaved?: (request: RequestModel) => void
}

function renderFolderNodes(
  collections: Collection[],
  selected: string | null,
  setSelected: (id: string | null) => void,
  level = 0
): Array<React.ReactElement | null> {
  return collections.flatMap((col) => {
    const items: Array<React.ReactElement | null> = [
      <Box key={col.id} sx={{ pl: level * 2 }}>
        <ListItemButton onClick={() => setSelected(col.id)}>
          <Radio checked={selected === col.id} />
          <ListItemText primary={col.name} />
        </ListItemButton>
      </Box>
    ]
    if (col.folders) {
      col.folders.forEach((f) => {
        items.push(
          <Box key={f.id} sx={{ pl: (level + 1) * 2 }}>
            <ListItemButton onClick={() => setSelected(f.id)}>
              <Radio checked={selected === f.id} />
              <ListItemText primary={f.name} />
            </ListItemButton>
          </Box>
        )
      })
    }
    return items
  })
}

/** Find which collection a node (collection or folder) belongs to. */
function findOwningCollection(collections: Collection[], nodeId: string): Collection | null {
  for (const col of collections) {
    if (col.id === nodeId) return col
    if (col.folders?.some((f) => f.id === nodeId)) return col
  }
  return null
}

/** Check whether a node ID is a folder (not a collection). */
function isFolderId(collections: Collection[], nodeId: string): boolean {
  return collections.some((col) => col.folders?.some((f) => f.id === nodeId))
}

export default function SaveToCollectionModal({
  open,
  onClose,
  request,
  onSaved
}: SaveToCollectionModalProps): React.ReactElement {
  const { collections, addRequestToCollection, addFolder } = useRequestManager()
  const [selected, setSelected] = useState<string | null>(null)
  const [newFolderName, setNewFolderName] = useState('')
  const { t } = useI18n()

  const handleSave = (): void => {
    if (selected) {
      if (isFolderId(collections, selected)) {
        const owner = findOwningCollection(collections, selected)
        if (owner) {
          addRequestToCollection(request, owner.id, selected)
        }
      } else {
        addRequestToCollection(request, selected)
      }
      if (onSaved) {
        onSaved({ ...request, collectionId: selected })
      }
    }
    onClose()
  }

  const handleCreateFolder = (): void => {
    if (!newFolderName.trim() || !selected) return
    if (isFolderId(collections, selected)) {
      const owner = findOwningCollection(collections, selected)
      if (owner) {
        addFolder(newFolderName.trim(), owner.id, selected)
      }
    } else {
      addFolder(newFolderName.trim(), selected)
    }
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
