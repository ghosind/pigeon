import React from 'react'
import CssBaseline from '@mui/material/CssBaseline'
import Layout from '@renderer/components/common/Layout'
import AppThemeProvider from '@renderer/contexts/ThemeContext'
import I18nProvider from '@renderer/contexts/I18nProvider'
import RequestPage from '@renderer/pages/RequestPage'

function App(): React.JSX.Element {
  return (
    <I18nProvider>
      <AppThemeProvider>
        <CssBaseline />
        <Layout>
          <RequestPage />
        </Layout>
      </AppThemeProvider>
    </I18nProvider>
  )
}

export default App
