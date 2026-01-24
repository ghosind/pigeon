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
    <TableContainer component={Box} sx={{ boxShadow: 'none', height: '100%', overflow: 'auto' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t('response.headersTable.name')}</TableCell>
            <TableCell>{t('response.headersTable.value')}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {headers.map(([k, v]) => (
            <TableRow key={k}>
              <TableCell>{k}</TableCell>
              <TableCell>{String(v)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  )
}
