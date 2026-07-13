/**
 * Dashboard — workspace overview page with card grid.
 */

import React, { useEffect, useState } from 'react'
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  IconButton,
  Grid
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import { useNavigate } from 'react-router-dom'
import { useWorkspaceStore } from '@renderer/stores'
import { useI18n } from '@renderer/contexts/useI18n'
import type { Workspace } from '@shared/types'

export default function DashboardPage(): React.JSX.Element {
  const navigate = useNavigate()
  const {
    workspaces,
    loading,
    hydrate,
    createWorkspace,
    removeWorkspace,
    setActiveWorkspace,
    updateWorkspace
  } = useWorkspaceStore()
  const { t } = useI18n()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [editTarget, setEditTarget] = useState<Workspace | null>(null)
  const [editName, setEditName] = useState('')
  const [editDesc, setEditDesc] = useState('')

  useEffect(() => {
    void hydrate()
  }, [hydrate])

  const handleCreate = async (): Promise<void> => {
    if (!newName.trim()) return
    const ws = await createWorkspace(newName.trim(), newDesc.trim())
    if (ws) {
      setDialogOpen(false)
      setNewName('')
      setNewDesc('')
    }
  }

  const handleOpen = (id: string): void => {
    setActiveWorkspace(id)
    navigate(`/workspace/${id}`)
  }

  const handleDelete = async (id: string): Promise<void> => {
    await window.api?.deleteWorkspace(id)
    removeWorkspace(id)
  }

  const handleEditOpen = (ws: Workspace): void => {
    setEditTarget(ws)
    setEditName(ws.name)
    setEditDesc(ws.description || '')
  }

  const handleEditSave = async (): Promise<void> => {
    if (!editTarget || !editName.trim()) return
    await window.api?.updateWorkspace(editTarget.id, {
      name: editName.trim(),
      description: editDesc.trim()
    })
    updateWorkspace(editTarget.id, {
      name: editName.trim(),
      description: editDesc.trim(),
      updateTime: new Date().toISOString()
    })
    setEditTarget(null)
    setEditName('')
    setEditDesc('')
  }

  const formatDate = (isoString: string): string => {
    try {
      return new Date(isoString).toLocaleDateString()
    } catch {
      return isoString || ''
    }
  }

  return (
    <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" fontWeight={600}>
          {t('dashboard.title')}
        </Typography>
        <Button variant="contained" startIcon={<AddIcon />} onClick={() => setDialogOpen(true)}>
          {t('dashboard.newWorkspace')}
        </Button>
      </Box>

      {loading ? (
        <Typography color="text.secondary">{t('common.loading')}</Typography>
      ) : workspaces.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography color="text.secondary" variant="h6">
            {t('dashboard.empty')}
          </Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>
            {t('dashboard.emptyHint')}
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {workspaces.map((ws) => (
            <Grid key={ws.id}>
              <Card variant="outlined" sx={{ width: 280 }}>
                <CardActionArea onClick={() => handleOpen(ws.id)}>
                  <CardContent>
                    <Box
                      sx={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'flex-start'
                      }}
                    >
                      <Box>
                        <Typography variant="h6" noWrap>
                          {ws.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                          {ws.description || t('dashboard.noDescription')}
                        </Typography>
                        <Typography
                          variant="caption"
                          color="text.secondary"
                          sx={{ mt: 1, display: 'block' }}
                        >
                          {t('dashboard.updated', { date: formatDate(ws.updateTime) })}
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditOpen(ws)
                          }}
                        >
                          <EditIcon fontSize="small" />
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation()
                            void handleDelete(ws.id)
                          }}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      </Box>
                    </Box>
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Create dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{t('dashboard.newWorkspace')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label={t('common.name')}
            fullWidth
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            sx={{ mt: 1 }}
          />
          <TextField
            label={t('dashboard.descriptionOptional')}
            fullWidth
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>{t('action.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => void handleCreate()}
            disabled={!newName.trim()}
          >
            {t('action.create')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Edit dialog */}
      <Dialog
        open={Boolean(editTarget)}
        onClose={() => setEditTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>{t('dashboard.editWorkspace')}</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            label={t('common.name')}
            fullWidth
            value={editName}
            onChange={(e) => setEditName(e.target.value)}
            sx={{ mt: 1 }}
          />
          <TextField
            label={t('dashboard.descriptionOptional')}
            fullWidth
            value={editDesc}
            onChange={(e) => setEditDesc(e.target.value)}
            sx={{ mt: 2 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditTarget(null)}>{t('action.cancel')}</Button>
          <Button
            variant="contained"
            onClick={() => void handleEditSave()}
            disabled={!editName.trim()}
          >
            {t('action.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
