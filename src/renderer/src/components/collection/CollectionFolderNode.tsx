import React, { useState } from 'react'
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Collapse
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import FolderIcon from '@mui/icons-material/Folder'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { type Collection, type CollectionFolder, type RequestModel } from '@shared/types'
import CollectionClickMenu from './CollectionClickMenu'
import CollectionRequestNode from './CollectionRequestNode'

type TreeNode = Collection | CollectionFolder

type CollectionFolderNodeProps = {
  node: TreeNode
  level: number
  onOpenRequest: (req: RequestModel) => void
  onRemove: (id: string) => void
  onAddRequest: (parentId: string | null) => void
  onEdit: (node: TreeNode) => void
  onAddFolder: (parentId?: string | null) => void
  onExport: (id: string) => void
}

export default function CollectionFolderNode({
  node,
  level,
  onOpenRequest,
  onRemove,
  onAddRequest,
  onEdit,
  onAddFolder,
  onExport
}: CollectionFolderNodeProps): React.JSX.Element {
  const [anchor, setAnchor] = useState<null | { x: number; y: number }>(null)
  const [menuOpenNodeId, setMenuOpenNodeId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<boolean>(true)

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
    <Box key={node.id}>
      <ListItemButton
        onClick={() => setExpanded((s) => !s)}
        onContextMenu={(e) => openMenu(e, node.id)}
        sx={{ pl: level * 2, display: 'flex', alignItems: 'center' }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              setExpanded((s) => !s)
            }}
          >
            {expanded ? <ExpandMoreIcon fontSize="small" /> : <ChevronRightIcon fontSize="small" />}
          </IconButton>
        </ListItemIcon>

        <ListItemIcon sx={{ minWidth: 36 }}>
          {expanded ? <FolderOpenIcon fontSize="small" /> : <FolderIcon fontSize="small" />}
        </ListItemIcon>

        <ListItemText primary={node.name} />

        <Box sx={{ ml: 'auto', display: 'flex', gap: 0.5 }}>
          <IconButton
            edge="end"
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              onAddRequest(node.id)
            }}
          >
            <AddIcon fontSize="small" />
          </IconButton>
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
        </Box>
      </ListItemButton>

      <Collapse in={expanded} timeout="auto" unmountOnExit>
        <List disablePadding>
          {('folders' in node ? (node as Collection).folders : [])?.map((f) => (
            <CollectionFolderNode
              key={f.id}
              node={f}
              level={level + 1}
              onOpenRequest={onOpenRequest}
              onRemove={onRemove}
              onAddRequest={onAddRequest}
              onEdit={onEdit}
              onAddFolder={onAddFolder}
              onExport={onExport}
            />
          ))}
          {('requests' in node ? (node as Collection).requests : [])?.map(
            (r) =>
              r && (
                <CollectionRequestNode
                  key={r.id}
                  node={r}
                  level={level + 1}
                  onOpenRequest={onOpenRequest}
                  onRemove={onRemove}
                  onEdit={onEdit}
                  onExport={onExport}
                />
              )
          )}
        </List>
      </Collapse>

      <CollectionClickMenu
        node={node}
        anchor={anchor}
        open={Boolean(anchor) && menuOpenNodeId === node.id}
        onAddRequest={onAddRequest}
        onAddFolder={onAddFolder}
        onEdit={onEdit}
        onRemove={onRemove}
        onExport={onExport}
        onCloseMenu={closeMenu}
      />
    </Box>
  )
}
