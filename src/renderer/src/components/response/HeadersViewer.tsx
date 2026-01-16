import {
  Box,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow
} from '@mui/material'
import { HTTPResponse } from '@shared/types/response'

type HeadersViewerProps = {
  response: HTTPResponse | null
}

export default function HeadersViewer({ response }: HeadersViewerProps): React.ReactElement {
  const headers = response?.headers
    ? Object.entries(response.headers as Record<string, string>)
    : []

  return (
    <TableContainer component={Box} sx={{ boxShadow: 'none' }}>
      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell>Value</TableCell>
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
