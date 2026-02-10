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
  InputBase,
  FormControl,
  Select,
  MenuItem,
  Button
} from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { KeyValuePair, KeyValueType } from '@shared/types/kv'
import { useI18n } from '../../contexts/useI18n'

type KeyValueEditorProps = {
  rows: KeyValuePair[]
  onChange: (rows: KeyValuePair[]) => void
  allowFile?: boolean
}

export default function KeyValueEditor({
  rows,
  onChange,
  allowFile
}: KeyValueEditorProps): React.ReactElement {
  const { t } = useI18n()
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
        type: patch.type ?? KeyValueType.Text,
        value: patch.value ?? '',
        enabled: patch.enabled ?? true
      }

      if (
        newRow.key === '' &&
        newRow.type === '' &&
        newRow.value === '' &&
        patch.enabled === undefined
      ) {
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

  const handleFileSelect = async (idx: number): Promise<void> => {
    try {
      const path: string | null = await window.api.openFileDialog()
      if (!path) {
        return
      }
      updateRow(idx, { value: path })
    } catch (e) {
      console.error('open file dialog failed', e)
    }
  }

  return (
    <Box>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ height: 36 }}>
            <TableCell sx={{ width: 20 }}></TableCell>
            <TableCell>{t('kv.key')}</TableCell>
            {allowFile && <TableCell sx={{ width: 60 }}>{t('kv.type')}</TableCell>}
            <TableCell>{t('kv.value')}</TableCell>
            <TableCell sx={{ width: 20 }}></TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {[...rows, { key: '', value: '', type: KeyValueType.Text, enabled: undefined }].map(
            (row, index) => {
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
                  <TableCell sx={{ width: 20 }}>
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
                      placeholder={t('kv.key')}
                      value={isPlaceholder ? '' : (row.key ?? '')}
                      onChange={(e) => updateRow(index, { key: e.target.value })}
                    />
                  </TableCell>
                  {allowFile && (
                    <TableCell>
                      <FormControl size="small" sx={{ width: 60 }}>
                        <Select
                          size="small"
                          variant="standard"
                          value={row.type ?? KeyValueType.Text}
                          onChange={(e) =>
                            updateRow(index, { type: e.target.value as KeyValueType })
                          }
                        >
                          <MenuItem value={KeyValueType.Text}>{t('kv.type.text')}</MenuItem>
                          <MenuItem value={KeyValueType.File}>{t('kv.type.file')}</MenuItem>
                        </Select>
                      </FormControl>
                    </TableCell>
                  )}
                  <TableCell>
                    {row.type === 'file' ? (
                      <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Button size="small" onClick={() => handleFileSelect(index)}>
                          {(row?.value && row.value.split('/').pop()) || t('kv.file.select')}
                        </Button>
                      </Box>
                    ) : (
                      <InputBase
                        size="small"
                        fullWidth
                        placeholder={t('kv.value')}
                        value={isPlaceholder ? '' : (row.value ?? '')}
                        onChange={(e) => updateRow(index, { value: e.target.value })}
                      />
                    )}
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
            }
          )}
        </TableBody>
      </Table>
      <Box sx={{ mt: 1 }} />
    </Box>
  )
}
