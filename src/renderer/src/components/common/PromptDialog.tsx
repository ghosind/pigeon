import React, { useEffect, useRef } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import { useI18n } from '@renderer/contexts/useI18n'

type PromptDialogProps = {
  open: boolean
  title?: string
  defaultValue?: string
  onClose: (value: string | null) => void
}

export default function PromptDialog({
  open,
  title,
  defaultValue = '',
  onClose
}: PromptDialogProps): React.JSX.Element {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const displayTitle = title ?? t('dialog.input')

  useEffect(() => {
    const handler = (e: KeyboardEvent): void => {
      if (!open) return
      if (e.key === 'Enter') onClose(inputRef.current?.value.trim() || null)
      if (e.key === 'Escape') onClose(null)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  return (
    <Dialog open={open} onClose={() => onClose(null)}>
      <DialogTitle>{displayTitle}</DialogTitle>
      <DialogContent>
        <TextField
          autoFocus
          fullWidth
          variant="outlined"
          inputRef={(el) => {
            inputRef.current = el as HTMLInputElement
          }}
          defaultValue={defaultValue}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={() => onClose(null)}>{t('action.cancel')}</Button>
        <Button
          onClick={() => onClose(inputRef.current?.value.trim() || null)}
          variant="contained"
          color="primary"
        >
          {t('action.ok')}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
