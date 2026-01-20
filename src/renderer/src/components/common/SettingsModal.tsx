import React from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import FormControl from '@mui/material/FormControl'
import InputLabel from '@mui/material/InputLabel'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Typography from '@mui/material/Typography'
import Divider from '@mui/material/Divider'
import { useThemeMode } from '../../contexts/useThemeMode'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): React.ReactElement {
  const { mode, setMode } = useThemeMode()

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, height: 360 }}>
          <Box sx={{ width: 220, borderRight: (theme) => `1px solid ${theme.palette.divider}` }}>
            <List>
              <ListItemButton selected>
                <ListItemText primary="General" />
              </ListItemButton>
            </List>
          </Box>

          <Box sx={{ flex: 1, p: 2 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              {/* Row: Theme */}
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="subtitle1">Theme</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Theme mode for the application interface.
                  </Typography>
                </Box>

                <FormControl sx={{ minWidth: 180 }} size="small">
                  <InputLabel id="theme-select-label">Theme</InputLabel>
                  <Select
                    labelId="theme-select-label"
                    value={mode}
                    label="Theme"
                    onChange={(e) => setMode(e.target.value as 'light' | 'dark' | 'system')}
                    size="small"
                  >
                    <MenuItem value="light">Light</MenuItem>
                    <MenuItem value="dark">Dark</MenuItem>
                    <MenuItem value="system">Sync with System</MenuItem>
                  </Select>
                </FormControl>
              </Box>

              <Divider />
            </Box>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal
