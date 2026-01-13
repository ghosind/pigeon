import {
  Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material'

type HeadersViewerProps = {
  response: any
}

export default function HeadersViewer({ response }: HeadersViewerProps) {
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
