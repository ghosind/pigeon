import React, { useEffect, useRef } from 'react'
import Dialog from '@mui/material/Dialog'
import DialogTitle from '@mui/material/DialogTitle'
import DialogContent from '@mui/material/DialogContent'
import DialogActions from '@mui/material/DialogActions'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'

type Props = {
  open: boolean
  title?: string
  defaultValue?: string
  onClose: (value: string | null) => void
}

export default function PromptDialog({
  open,
  title = 'Input',
  defaultValue = '',
  onClose
}: Props): React.JSX.Element {
  const inputRef = useRef<HTMLInputElement | null>(null)

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
      <DialogTitle>{title}</DialogTitle>
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
        <Button onClick={() => onClose(null)}>Cancel</Button>
        <Button
          onClick={() => onClose(inputRef.current?.value.trim() || null)}
          variant="contained"
          color="primary"
        >
          OK
        </Button>
      </DialogActions>
    </Dialog>
  )
}
