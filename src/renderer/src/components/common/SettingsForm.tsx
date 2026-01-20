import React from 'react'
import Box from '@mui/material/Box'
import Typography from '@mui/material/Typography'
import FormControl from '@mui/material/FormControl'
import Select from '@mui/material/Select'
import MenuItem from '@mui/material/MenuItem'
import Switch from '@mui/material/Switch'
import TextField from '@mui/material/TextField'
import { FieldSchema } from '@renderer/settings/schema'

interface SettingsFormProps {
  fields: FieldSchema[]
}

function renderField(field: FieldSchema): React.ReactElement | null {
  switch (field.type) {
    case 'select':
      return (
        <FormControl sx={{ minWidth: 180 }} size="small">
          <Select
            value={field.value}
            onChange={(e) => field.onChange((e.target as HTMLSelectElement).value)}
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
        <Switch checked={Boolean(field.value)} onChange={(e) => field.onChange(e.target.checked)} />
      )
    case 'text':
      return (
        <TextField
          size="small"
          value={field.value ?? ''}
          onChange={(e) => field.onChange(e.target.value)}
        />
      )
    case 'number':
      return (
        <TextField
          size="small"
          type="number"
          value={field.value ?? ''}
          onChange={(e) => field.onChange(Number(e.target.value))}
        />
      )
    default:
      return null
  }
}

export default function SettingsForm({ fields }: SettingsFormProps): React.ReactElement {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {fields.map((f) => (
        <Box
          key={f.key}
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}
        >
          <Box sx={{ maxWidth: '60%' }}>
            <Typography variant="subtitle1">{f.title}</Typography>
            {f.description ? (
              <Typography variant="body2" color="text.secondary">
                {f.description}
              </Typography>
            ) : null}
          </Box>

          <Box>{renderField(f)}</Box>
        </Box>
      ))}
    </Box>
  )
}
