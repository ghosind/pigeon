import { ThemeProvider, createTheme } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import RequestPage from './pages/RequestPage'

const theme = createTheme({
  palette: {
    mode: 'light'
  }
})

function App(): React.JSX.Element {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <RequestPage />
    </ThemeProvider>
  )
}

export default App
