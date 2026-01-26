import React, { useState } from 'react'
import {
  Box,
  IconButton,
  List,
  ListItemButton,
  ListItemText,
  Tooltip,
  useTheme,
  Paper
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
import { useRequestManager } from '@renderer/contexts/useRequestManager'
import { HTTPMethod, Request, RequestType } from '@shared/types'
import * as uuid from 'uuid'
import PromptDialog from '../common/PromptDialog'

export default function CollectionPanel(): React.JSX.Element {
  const { collections, addCollection, removeCollection, openRequest } = useRequestManager()
  const theme = useTheme()

  const [promptOpen, setPromptOpen] = useState(false)

  const handleAdd = (): void => {
    setPromptOpen(true)
  }

  const handlePromptClose = (value: string | null): void => {
    setPromptOpen(false)
    if (!value) return
    const newReq: Request = {
      type: RequestType.HTTP,
      id: uuid.v4(),
      title: value,
      request: { method: HTTPMethod.GET, url: '' }
    }
    addCollection(newReq)
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
          <Box sx={{ fontWeight: 600 }}>Collections</Box>
          <Tooltip title="New">
            <IconButton size="small" onClick={handleAdd}>
              <AddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>

        <PromptDialog open={promptOpen} title="Collection name" onClose={handlePromptClose} />

        <List sx={{ flex: 1, overflow: 'auto', background: 'transparent' }}>
          {collections.map((c) => (
            <ListItemButton
              key={c.id}
              onClick={() => openRequest(c, { newTab: true })}
              sx={{ pr: 1, '&:hover': { bgcolor: theme.palette.action.hover } }}
            >
              <ListItemText primary={c.title} secondary={c.request.url || '(empty)'} />
              <IconButton
                edge="end"
                size="small"
                onClick={(e) => {
                  e.stopPropagation()
                  removeCollection(c.id)
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </ListItemButton>
          ))}
        </List>
      </Paper>
    </Box>
  )
}
