import React, { useEffect, useState } from 'react'
import { TextField, InputAdornment } from '@mui/material'
import KeyboardIcon from '@mui/icons-material/Keyboard'

type ShortcutCaptureProps = {
  value: string
  onChange: (value: string) => void
}

/**
 * Formats a KeyboardEvent into a shortcut string (e.g. "Ctrl+Enter", "Cmd+Shift+K").
 */
function formatShortcut(e: KeyboardEvent): string | null {
  // Ignore standalone modifier keys
  if (['Control', 'Shift', 'Alt', 'Meta'].includes(e.key)) return null

  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.shiftKey) parts.push('Shift')
  if (e.altKey) parts.push('Alt')

  // Normalise key name
  const key = e.key.length === 1 ? e.key.toUpperCase() : e.key
  parts.push(key)

  return parts.join('+')
}

export default function ShortcutCapture({
  value,
  onChange
}: ShortcutCaptureProps): React.ReactElement {
  const [capturing, setCapturing] = useState(false)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    setDisplay(value)
  }, [value])

  // Use window-level listener for reliable key capture
  useEffect(() => {
    if (!capturing) return

    const handleKeyDown = (e: KeyboardEvent): void => {
      e.preventDefault()
      e.stopPropagation()

      const shortcut = formatShortcut(e)
      if (shortcut) {
        setDisplay(shortcut)
        onChange(shortcut)
      }
      setCapturing(false)
    }

    window.addEventListener('keydown', handleKeyDown, { capture: true })
    return () => window.removeEventListener('keydown', handleKeyDown, { capture: true })
  }, [capturing, onChange])

  const startCapture = (): void => {
    setCapturing(true)
    setDisplay('')
  }

  return (
    <TextField
      size="small"
      sx={{ width: 200 }}
      value={capturing ? 'Press keys...' : display}
      onClick={startCapture}
      onFocus={startCapture}
      InputProps={{
        readOnly: true,
        startAdornment: (
          <InputAdornment position="start">
            <KeyboardIcon fontSize="small" color="action" />
          </InputAdornment>
        )
      }}
      inputProps={{
        sx: { cursor: 'pointer', caretColor: capturing ? 'transparent' : undefined }
      }}
    />
  )
}
