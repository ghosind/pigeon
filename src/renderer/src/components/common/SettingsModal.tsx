import React, { useEffect, useState, useRef } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import Box from '@mui/material/Box'
import List from '@mui/material/List'
import ListItemButton from '@mui/material/ListItemButton'
import ListItemText from '@mui/material/ListItemText'
import { useTheme } from '@mui/material/styles'
import SettingsForm from './SettingsForm'
import { useSettingsSchema } from '@renderer/settings/schema'
import { useI18n } from '../../contexts/useI18n'

interface SettingsModalProps {
  open: boolean
  onClose: () => void
}

export function SettingsModal({ open, onClose }: SettingsModalProps): React.ReactElement {
  const { t } = useI18n()
  const theme = useTheme()
  const sections = useSettingsSchema()
  const [activeKey, setActiveKey] = useState<string>(sections[0]?.key ?? '')
  const [localSections, setLocalSections] = useState(() => sections)

  const sectionsSnapshotRef = useRef<string | null>(null)

  // Track sections identity changes — when schema re-generates (e.g., lang/t config changes),
  // update active key if the current one disappeared
  const prevSectionsLength = useRef(sections.length)
  useEffect(() => {
    if (prevSectionsLength.current !== sections.length) {
      // New sections appeared — the schema re-ran
      setLocalSections(sections)
    }
    prevSectionsLength.current = sections.length
  }, [sections])

  useEffect(() => {
    // Keep local state in sync when sections identity changes
    const snap = JSON.stringify(
      sections.map((s) => ({
        key: s.key,
        fields: s.fields.map((f) => ({ key: f.key, value: f.value }))
      }))
    )

    if (sectionsSnapshotRef.current === snap) return

    sectionsSnapshotRef.current = snap

    setLocalSections(sections)
    if (!sections.find((s) => s.key === activeKey)) {
      setActiveKey(sections[0]?.key ?? '')
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections])

  const navWidth = 180
  const activeSection = localSections.find((s) => s.key === activeKey)

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { height: 520 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>{t('settings.title')}</DialogTitle>
      <DialogContent sx={{ p: 0, overflow: 'hidden' }}>
        <Box sx={{ display: 'flex', height: '100%' }}>
          {/* Left navigation */}
          <Box
            sx={{
              width: navWidth,
              flexShrink: 0,
              borderRight: `1px solid ${theme.palette.divider}`,
              overflow: 'auto'
            }}
          >
            <List dense>
              {sections.map((s) => (
                <ListItemButton
                  key={s.key}
                  selected={activeKey === s.key}
                  onClick={() => setActiveKey(s.key)}
                  sx={{ borderRadius: 0 }}
                >
                  <ListItemText
                    primary={s.title}
                    primaryTypographyProps={{
                      fontSize: 13,
                      fontWeight: activeKey === s.key ? 600 : 400
                    }}
                  />
                </ListItemButton>
              ))}
            </List>
          </Box>

          {/* Right content */}
          <Box sx={{ flex: 1, p: 3, overflow: 'auto' }}>
            {activeSection ? (
              <SettingsForm
                fields={activeSection.fields.map((f) => ({
                  ...f,
                  onChange: (v: unknown) => {
                    // Sync local state immediately for responsive UI
                    setLocalSections((prev) =>
                      prev.map((sec) =>
                        sec.key !== activeKey
                          ? sec
                          : {
                              ...sec,
                              fields: sec.fields.map((ff) =>
                                ff.key === f.key ? { ...ff, value: v } : ff
                              )
                            }
                      )
                    )
                    // Call the original handler (persists to store / localStorage)
                    f.onChange(v)
                  }
                }))}
              />
            ) : null}
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  )
}

export default SettingsModal
