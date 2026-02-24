import React, { useEffect, useState } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import SettingsForm from './SettingsForm'
import { useSettingsSchema } from '@renderer/settings/schema'
import { useI18n } from '../../contexts/useI18n'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): React.ReactElement {
  const { t } = useI18n()
  const sections = useSettingsSchema()
  const [activeKey, setActiveKey] = useState<string>(sections[0]?.key ?? '')
  const [localSections, setLocalSections] = useState(() => sections)

  useEffect(() => {
    setLocalSections(sections)
    if (!sections.find((s) => s.key === activeKey)) {
      setActiveKey(sections[0]?.key ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections])

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>{t('settings.title')}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', gap: 2, height: 360 }}>
          <Box
            sx={{ width: 220, borderRight: (theme) => `1px solid ${theme.palette.divider}`, p: 1 }}
          >
            <List>
              {sections.map((s) => (
                <ListItemButton
                  key={s.key}
                  selected={activeKey === s.key}
                  onClick={() => setActiveKey(s.key)}
                >
                  <ListItemText primary={s.title} />
                </ListItemButton>
              ))}
            </List>
          </Box>

          <Box sx={{ flex: 1, p: 2 }}>
            <SettingsForm
              fields={
                localSections
                  .find((s) => s.key === activeKey)
                  ?.fields.map((f) => ({
                    ...f,
                    onChange: (v: unknown) => {
                      // update local state
                      setLocalSections((prev) =>
                        prev.map((sec) => {
                          if (sec.key !== activeKey) return sec
                          return {
                            ...sec,
                            fields: sec.fields.map((ff) =>
                              ff.key === f.key ? { ...ff, value: v } : ff
                            )
                          }
                        })
                      )

                      // call original handler to persist
                      f.onChange(v)
                    }
                  })) ?? []
              }
            />
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal
