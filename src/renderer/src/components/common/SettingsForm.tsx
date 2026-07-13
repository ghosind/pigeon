import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import Button from '@mui/material/Button'
import type { FieldSchema } from '@renderer/settings/schema'

interface SettingsFormProps {
  fields: FieldSchema[]
}

function renderField(field: FieldSchema): React.ReactElement | null {
  switch (field.type) {
    case 'select':
      return (
        <FormControl sx={{ minWidth: 180 }} size="small">
          <Select
            value={String(field.value ?? '')}
            onChange={(e) => field.onChange(e.target.value)}
            size="small"
          >
            {field.options?.map((o) => (
              <MenuItem key={o.value} value={o.value}>
                {o.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )
    case 'boolean':
      return (
        <Switch
          checked={Boolean(field.value)}
          onChange={(_e, checked) => field.onChange(checked)}
        />
      )
    case 'text':
      return (
        <TextField
          size="small"
          sx={{ width: 200 }}
          value={String(field.value ?? '')}
          onChange={(e) => field.onChange(e.target.value)}
        />
      )
    case 'number':
      return (
        <TextField
          size="small"
          type="number"
          sx={{ width: 140 }}
          value={field.value ?? ''}
          onChange={(e) => field.onChange(Number(e.target.value))}
        />
      )
    case 'action':
      return (
        <Button variant="contained" size="small" onClick={() => field.onChange(null)}>
          {field.actionLabel}
        </Button>
      )
    case 'info':
      return null
    default:
      return null
  }
}

export default function SettingsForm({ fields }: SettingsFormProps): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {fields.map((f) => {
        if (f.type === 'info') {
          return (
            <Box key={f.key}>
              <Typography variant="subtitle1" gutterBottom>
                {f.title}
              </Typography>
              {(f.infoLines ?? []).map((line, i) => (
                <Typography key={i} variant="body2" color="text.secondary">
                  {line}
                </Typography>
              ))}
            </Box>
          )
        }

        return (
          <Box
            key={f.key}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              py: 0.5
            }}
          >
            <Box sx={{ maxWidth: '55%', minWidth: 0 }}>
              {f.title ? (
                <Typography variant="body2" fontWeight={500}>
                  {f.title}
                </Typography>
              ) : null}
              {f.description ? (
                <Typography variant="caption" color="text.secondary">
                  {f.description}
                </Typography>
              ) : null}
            </Box>

            <Box sx={{ flexShrink: 0, ml: 2 }}>{renderField(f)}</Box>
          </Box>
        )
      })}
    </Box>
  )
}
