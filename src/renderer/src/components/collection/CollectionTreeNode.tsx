import React, { useState } from 'react'
import {
  Box,
  List,
  ListItemButton,
  ListItemText,
  ListItemIcon,
  IconButton,
  Menu,
  MenuItem,
  Divider,
  Collapse
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import FileDownloadIcon from '@mui/icons-material/FileDownload'
import FolderOpenIcon from '@mui/icons-material/FolderOpen'
import FolderIcon from '@mui/icons-material/Folder'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { CollectionNode, Request } from '@shared/types'
import { useI18n } from '../../contexts/useI18n'

type CollectionTreeNodeProps = {
  node: CollectionNode
  level: number
  onOpenRequest: (req: Request) => void
  onRemove: (id: string) => void
  onAddRequest: (parentId: string | null) => void
  onEdit: (node: CollectionNode) => void
  onAddFolder: (parentId: string | null) => void
  onExport: (id: string) => void
}

export default function TreeNode({
  node,
  level,
  onOpenRequest,
  onRemove,
  onAddRequest,
  onEdit,
  onAddFolder,
  onExport
}: CollectionTreeNodeProps): React.ReactElement | null {
  const [anchor, setAnchor] = useState<null | { x: number; y: number }>(null)
  const [menuOpenNodeId, setMenuOpenNodeId] = useState<string | null>(null)
  const { t } = useI18n()
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
  if (!node) return null

  if (node.type === 'folder') {
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
              {expanded ? (
                <ExpandMoreIcon fontSize="small" />
              ) : (
                <ChevronRightIcon fontSize="small" />
              )}
            </IconButton>
          </ListItemIcon>

          <ListItemIcon sx={{ minWidth: 36 }}>
            {expanded ? <FolderOpenIcon fontSize="small" /> : <FolderIcon fontSize="small" />}
          </ListItemIcon>

          <ListItemText primary={node.title} />

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
            {node.children &&
              node.children.map((c) => (
                <TreeNode
                  key={c.id}
                  node={c}
                  level={level + 1}
                  onOpenRequest={onOpenRequest}
                  onRemove={onRemove}
                  onAddRequest={onAddRequest}
                  onEdit={onEdit}
                  onAddFolder={onAddFolder}
                  onExport={onExport}
                />
              ))}
          </List>
        </Collapse>

        <Menu
          open={Boolean(anchor) && menuOpenNodeId === node.id}
          onClose={closeMenu}
          anchorReference="anchorPosition"
          anchorPosition={anchor ? { top: anchor.y, left: anchor.x } : undefined}
        >
          <MenuItem
            onClick={() => {
              closeMenu()
              onAddRequest(node.id)
            }}
          >
            <FolderOpenIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.newRequest')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              closeMenu()
              onAddFolder(node.id)
            }}
          >
            <AddIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.newFolder')}
          </MenuItem>
          <Divider />
          <MenuItem
            onClick={() => {
              closeMenu()
              onEdit(node)
            }}
          >
            <EditIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.rename')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              closeMenu()
              onExport(node.id)
            }}
          >
            <FileDownloadIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.export')}
          </MenuItem>
          <MenuItem
            onClick={() => {
              closeMenu()
              onRemove(node.id)
            }}
          >
            <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.delete')}
          </MenuItem>
        </Menu>
      </Box>
    )
  }

  return (
    <>
      <ListItemButton
        key={node.id}
        sx={{ pl: level * 2 }}
        onClick={() => onOpenRequest(node.request)}
        onContextMenu={(e) => openMenu(e, node.id)}
      >
        <ListItemText
          primary={node.request?.title || '(untitled)'}
          secondary={node.request?.request?.url || '(empty)'}
        />
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

      <Menu
        open={Boolean(anchor) && menuOpenNodeId === node.id}
        onClose={closeMenu}
        anchorReference="anchorPosition"
        anchorPosition={anchor ? { top: anchor.y, left: anchor.x } : undefined}
      >
        <MenuItem
          onClick={() => {
            closeMenu()
            onEdit(node)
          }}
        >
          <EditIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.rename')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            onExport(node.id)
          }}
        >
          <FileDownloadIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.export')}
        </MenuItem>
        <MenuItem
          onClick={() => {
            closeMenu()
            onRemove(node.id)
          }}
        >
          <DeleteIcon fontSize="small" sx={{ mr: 1 }} /> {t('collection.menu.delete')}
        </MenuItem>
      </Menu>
    </>
  )
}
