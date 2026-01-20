import React from 'react'
import { ThemeProvider } from '@mui/material/styles'
import CssBaseline from '@mui/material/CssBaseline'
import RequestPage from './pages/RequestPage'
import { lightTheme } from './themes'

function App(): React.JSX.Element {
  return (
    <ThemeProvider theme={lightTheme}>
      <CssBaseline />
      <RequestPage />
    </ThemeProvider>
  )
}

export default App
