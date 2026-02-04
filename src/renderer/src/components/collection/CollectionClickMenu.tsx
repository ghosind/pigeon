import React from 'react'
import { Menu, MenuItem, Divider } from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import { CollectionNode } from '@shared/types'
import { useI18n } from '../../contexts/useI18n'

type CollectionClickMenuProps = {
  node: CollectionNode
  open: boolean
  anchor: { x: number; y: number } | null
  onRemove: (id: string) => void
  onAddRequest: (parentId: string | null) => void
  onEdit: (node: CollectionNode) => void
  onAddFolder: (parentId: string | null) => void
  onExport: (id: string) => void
  onCloseMenu: () => void
}

export default function CollectionClickMenu({
  node,
  open,
  anchor,
  onRemove,
  onAddRequest,
  onEdit,
  onAddFolder,
  onExport,
  onCloseMenu
}: CollectionClickMenuProps): React.JSX.Element {
  const { t } = useI18n()

  return (
    <Menu
      open={open}
      onClose={onCloseMenu}
      anchorReference="anchorPosition"
      anchorPosition={anchor ? { top: anchor.y, left: anchor.x } : undefined}
    >
      {node.type === 'folder' && (
        <>
          <MenuItem
            onClick={() => {
              onCloseMenu()
              onAddRequest(node.id)
            }}
          >
            <AddIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.newRequest')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              onCloseMenu()
              onAddFolder(node.id)
            }}
          >
            <FolderOpenIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.newFolder')}
          </MenuItem>
          <Divider />
        </>
      )}

      <MenuItem
        onClick={() => {
          onCloseMenu()
          onEdit(node)
        }}
      >
        <EditIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.rename')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          onCloseMenu()
          onExport(node.id)
        }}
      >
        <FileDownloadIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.export')}
      </MenuItem>
      <MenuItem
        onClick={() => {
          onCloseMenu()
          onRemove(node.id)
        }}
      >
        <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.delete')}
      </MenuItem>
    </Menu>
  )
}
