import React, { useState } from 'react'
import {
  Box,
  ListItemButton,
  Chip,
  Typography,
  Divider,
  IconButton,
  Collapse,
  useTheme
} from '@mui/material'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { Request, RequestHistory } from '@shared/types'
import { getMethodColors } from '@renderer/shared/constants/methodColors'

type HistoryGroupProps = {
  title: string
  histories: RequestHistory[]
  openRequest: (req: Request) => void
}

export default function HistoryGroup({
  title,
  histories,
  openRequest
}: HistoryGroupProps): React.JSX.Element {
  const theme = useTheme()
  const [expanded, setExpanded] = useState<boolean>(true)

  const toggle = (): void => setExpanded((s) => !s)

  const methodColors = getMethodColors(theme)

  return (
    <Box sx={{ mb: 1 }}>
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          px: 1,
          py: 0.5,
          color: theme.palette.text.secondary,
          fontSize: 12,
          fontWeight: 700
        }}
      >
        <Box>{title}</Box>
        <IconButton size="small" onClick={toggle} aria-label={expanded ? 'collapse' : 'expand'}>
          {expanded ? <ExpandLessIcon fontSize="small" /> : <ExpandMoreIcon fontSize="small" />}
        </IconButton>
      </Box>
      <Collapse in={expanded} timeout="auto" unmountOnExit>
        {histories.map((h) => {
          const method = (h.request.method || '').toString().toUpperCase()
          const color = methodColors[method] || theme.palette.text.primary

          return (
            <ListItemButton
              key={h.id}
              onClick={() => {
                const req: Request = {
                  id: h.id,
                  type: h.type,
                  request: h.request
                }
                openRequest(req)
              }}
              sx={{ '&:hover': { bgcolor: theme.palette.action.hover }, px: 1 }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, width: '100%' }}>
                <Chip
                  label={method}
                  size="small"
                  sx={{
                    minWidth: 44,
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: color,
                    fontWeight: 800,
                    textTransform: 'uppercase'
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography noWrap variant="body2">
                    {h.request.url}
                  </Typography>
                  <Typography noWrap variant="caption" color="text.secondary">
                    {new Date(h.timestamp).toLocaleTimeString()}
                  </Typography>
                </Box>
              </Box>
            </ListItemButton>
          )
        })}
      </Collapse>
      <Divider />
    </Box>
  )
}
