import React from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import Layout from '@renderer/components/common/Layout'
import AppThemeProvider from '@renderer/contexts/ThemeContext'
import RequestPage from '@renderer/pages/RequestPage'

function App(): React.JSX.Element {
  return (
    <AppThemeProvider>
      <CssBaseline />
      <Layout>
        <RequestPage />
      </Layout>
    </AppThemeProvider>
  )
}

export default App
