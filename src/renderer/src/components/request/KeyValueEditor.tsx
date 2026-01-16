import React, { useRef, useState } from 'react'
import {
  Box,
  IconButton,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  InputBase
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { KeyValuePair } from '@renderer/types/request'

type KeyValueEditorProps = {
  rows: KeyValuePair[]
  onChange: (rows: KeyValuePair[]) => void
}

export default function KeyValueEditor({
  rows,
  onChange
}: KeyValueEditorProps): React.ReactElement {
  const dragIndex = useRef<number | null>(null)
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null)

  const handleDragStart = (e: React.DragEvent, idx: number): void => {
    dragIndex.current = idx
    e.dataTransfer.effectAllowed = 'move'
    try {
      e.dataTransfer.setData('text/plain', String(idx))
    } catch (err) {
      console.error('Drag start setData failed:', err)
    }
  }

  const handleDragOver = (e: React.DragEvent, idx: number): void => {
    e.preventDefault()
    if (dragIndex.current === null) return
    if (dragOverIndex !== idx) setDragOverIndex(idx)
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, idx: number): void => {
    e.preventDefault()
    const from = dragIndex.current
    const to = idx
    if (from === null || from === undefined) return

    if (to === rows.length) {
      const updated = [...rows]
      const [moved] = updated.splice(from, 1)
      updated.push(moved)
      onChange(updated)
    } else if (from !== to) {
      const updated = [...rows]
      const [moved] = updated.splice(from, 1)
      const insertIndex = to > from ? to - 1 : to
      updated.splice(insertIndex, 0, moved)
      onChange(updated)
    }

    dragIndex.current = null
    setDragOverIndex(null)
  }

  const handleDragEnd = (): void => {
    dragIndex.current = null
    setDragOverIndex(null)
  }

  const updateRow = (idx: number, patch: Partial<KeyValuePair>): void => {
    const isPlaceholder = idx === rows.length

    if (isPlaceholder) {
      const newRow: KeyValuePair = {
        key: patch.key ?? '',
        value: patch.value ?? '',
        enabled: patch.enabled ?? true
      }

      if (newRow.key === '' && newRow.value === '' && patch.enabled === undefined) {
        return
      }

      onChange([...rows, newRow])
    } else {
      onChange(rows.map((r, index) => (index === idx ? { ...r, ...patch } : r)))
    }
  }

  const removeRow = (idx: number): void => {
    onChange(rows.filter((_, index) => index !== idx))
  }

  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ height: 36 }}>
            <TableCell sx={{ width: 80 }}></TableCell>
            <TableCell>Key</TableCell>
            <TableCell>Value</TableCell>
            <TableCell sx={{ width: 60 }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...rows, { key: '', value: '', enabled: undefined }].map((row, index) => {
            const isPlaceholder = index === rows.length
            return (
              <TableRow
                key={index}
                draggable={!isPlaceholder}
                onDragStart={(e) => (isPlaceholder ? undefined : handleDragStart(e, index))}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                sx={{
                  bgcolor: dragOverIndex === index ? 'action.selected' : undefined,
                  cursor: isPlaceholder ? 'default' : 'grab'
                }}
              >
                <TableCell sx={{ width: 80 }}>
                  <Checkbox
                    checked={row.enabled ?? true}
                    onChange={(e) => updateRow(index, { enabled: e.target.checked })}
                    sx={{ visibility: isPlaceholder ? 'hidden' : 'visible' }}
                  />
                </TableCell>
                <TableCell>
                  <InputBase
                    size="small"
                    fullWidth
                    placeholder="Key"
                    value={isPlaceholder ? '' : (row.key ?? '')}
                    onChange={(e) => updateRow(index, { key: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <InputBase
                    size="small"
                    fullWidth
                    placeholder="Value"
                    value={isPlaceholder ? '' : (row.value ?? '')}
                    onChange={(e) => updateRow(index, { value: e.target.value })}
                  />
                </TableCell>
                <TableCell>
                  <IconButton
                    size="small"
                    onClick={() => removeRow(index)}
                    sx={{ visibility: isPlaceholder ? 'hidden' : 'visible' }}
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
      <Box sx={{ mt: 1 }} />
    </Box>
  )
}
