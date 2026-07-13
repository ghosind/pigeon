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
  /** Requests that belong to this folder (already filtered by folderId). */
  childRequests?: RequestModel[]
  onOpenRequest: (req: RequestModel) => void
  onRemove: (id: string) => void
  onAddRequest: (parentId: string | null) => void
  onEdit: (node: TreeNode) => void
  onAddFolder: (parentId?: string | null) => void
  onExport: (id: string) => void
}

const FOLD_COLLAPSE_PREFIX = 'pigeon:foldCollapse:'

export default function CollectionFolderNode({
  node,
  level,
  childRequests,
  onOpenRequest,
  onRemove,
  onAddRequest,
  onEdit,
  onAddFolder,
  onExport
}: CollectionFolderNodeProps): React.JSX.Element {
  const [anchor, setAnchor] = useState<null | { x: number; y: number }>(null)
  const [menuOpenNodeId, setMenuOpenNodeId] = useState<string | null>(null)
  const [expanded, setExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem(FOLD_COLLAPSE_PREFIX + node.id) !== '0'
    } catch {
      return true
    }
  })

  const openMenu = (e: React.MouseEvent, id: string): void => {
    e.preventDefault()
    setMenuOpenNodeId(id)
    setAnchor({ x: e.clientX, y: e.clientY })
  }

  const closeMenu = (): void => {
    setAnchor(null)
    setMenuOpenNodeId(null)
  }

  const toggleExpanded = (): void => {
    setExpanded((prev) => {
      const next = !prev
      try {
        localStorage.setItem(FOLD_COLLAPSE_PREFIX + node.id, next ? '1' : '0')
      } catch {
        /* ignore */
      }
      return next
    })
  }

  const getChildFolders = (): CollectionFolder[] => {
    if ('folders' in node) return (node as Collection).folders || []
    return []
  }

  return (
    <Box key={node.id}>
      <ListItemButton
        onClick={toggleExpanded}
        onContextMenu={(e) => openMenu(e, node.id)}
        sx={{ pl: level * 2, display: 'flex', alignItems: 'center' }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          <IconButton
            size="small"
            onClick={(e) => {
              e.stopPropagation()
              toggleExpanded()
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
          {/* Nested child folders */}
          {getChildFolders().map((f) => (
            <CollectionFolderNode
              key={f.id}
              node={f}
              level={level + 1}
              childRequests={[]}
              onOpenRequest={onOpenRequest}
              onRemove={onRemove}
              onAddRequest={onAddRequest}
              onEdit={onEdit}
              onAddFolder={onAddFolder}
              onExport={onExport}
            />
          ))}
          {/* Requests that belong to this folder */}
          {(childRequests || []).map(
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
        onAddRequest={() => onAddRequest(node.id)}
        onAddFolder={() => onAddFolder(node.id)}
        onEdit={() => onEdit(node)}
        onRemove={() => onRemove(node.id)}
        onExport={() => onExport(node.id)}
        onCloseMenu={closeMenu}
      />
    </Box>
  )
}
