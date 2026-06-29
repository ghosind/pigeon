import React, { useState } from 'react'
import { ListItemButton, ListItemText, IconButton } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import EditIcon from '@mui/icons-material/Edit'
import type { RequestModel, Collection, CollectionFolder } from '@shared/types'
import CollectionClickMenu from './CollectionClickMenu'

type CollectionRequestNodeProps = {
  node: RequestModel
  level: number
  onOpenRequest: (req: RequestModel) => void
  onRemove: (id: string) => void
  onEdit: (node: Collection | CollectionFolder) => void
  onExport: (id: string) => void
}

export default function CollectionRequestNode({
  node,
  level,
  onOpenRequest,
  onRemove,
  onEdit,
  onExport
}: CollectionRequestNodeProps): React.ReactElement | null {
  const [anchor, setAnchor] = useState<null | { x: number; y: number }>(null)
  const [menuOpenNodeId, setMenuOpenNodeId] = useState<string | null>(null)

  const openMenu = (e: React.MouseEvent, id: string): void => {
    e.preventDefault()
    setMenuOpenNodeId(id)
    setAnchor({ x: e.clientX, y: e.clientY })
  }

  const closeMenu = (): void => {
    setAnchor(null)
    setMenuOpenNodeId(null)
  }

  return (
    <>
      <ListItemButton
        key={node.id}
        sx={{ pl: level * 2 }}
        onClick={() => onOpenRequest(node)}
        onContextMenu={(e) => openMenu(e, node.id)}
      >
        <ListItemText primary={node.name || '(untitled)'} secondary={node.url || '(empty)'} />
        <IconButton
          edge="end"
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onEdit(node)
          }}
        >
          <EditIcon fontSize="small" />
        </IconButton>
        <IconButton
          edge="end"
          size="small"
          onClick={(e) => {
            e.stopPropagation()
            onRemove(node.id)
          }}
        >
          <DeleteIcon fontSize="small" />
        </IconButton>
      </ListItemButton>

      <CollectionClickMenu
        node={node}
        anchor={anchor}
        open={Boolean(anchor) && menuOpenNodeId === node.id}
        onAddRequest={() => {}}
        onAddFolder={() => {}}
        onEdit={onEdit}
        onRemove={onRemove}
        onExport={onExport}
        onCloseMenu={closeMenu}
      />
    </>
  )
}
