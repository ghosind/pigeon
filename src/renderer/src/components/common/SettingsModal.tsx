import React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import SettingsForm from './SettingsForm'
import { useSettingsSchema } from '@renderer/settings/schema'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): React.ReactElement {
  const schema = useSettingsSchema()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, height: 360 }}>
          <Box
            sx={{ width: 220, borderRight: (theme) => `1px solid ${theme.palette.divider}`, p: 1 }}
          >
            <List>
              <ListItemButton selected>
                <ListItemText primary="General" />
              </ListItemButton>
            </List>
          </Box>

          <Box sx={{ flex: 1, p: 2 }}>
            <SettingsForm fields={schema} />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal
