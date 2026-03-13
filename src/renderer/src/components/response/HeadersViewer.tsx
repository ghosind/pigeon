import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material'
import { HTTPResponse } from '@shared/types'
import { useI18n } from '../../contexts/useI18n'

type HeadersViewerProps = {
  response?: HTTPResponse
}

export default function HeadersViewer({ response }: HeadersViewerProps): React.ReactElement {
  const { t } = useI18n()
  const headers = response?.headers
    ? Object.entries(response.headers as Record<string, string>)
    : []

  return (
    <TableContainer
      component={Box}
      sx={{
        boxShadow: 'none',
        height: '100%',
        minHeight: 0,
        overflow: 'auto',
        display: 'flex',
        flexDirection: 'column'
      }}
    >
      <Table size="small" sx={{ tableLayout: 'fixed', width: '100%' }}>
        <TableHead>
          <TableRow>
            <TableCell sx={{ width: '25%', maxWidth: '25%' }}>
              {t('response.headersTable.name')}
            </TableCell>
            <TableCell sx={{ width: '75%', maxWidth: '75%' }}>
              {t('response.headersTable.value')}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {headers.map(([k, v]) => (
            <TableRow key={k}>
              <TableCell sx={{ verticalAlign: 'top', wordBreak: 'break-all' }}>{k}</TableCell>
              <TableCell
                sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', overflowWrap: 'anywhere' }}
              >
                {String(v)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
