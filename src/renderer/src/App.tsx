import React, { useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom'
import CssBaseline from '@mui/material/CssBaseline'
import AppThemeProvider from '@renderer/contexts/ThemeContext'
import I18nProvider from '@renderer/contexts/I18nProvider'
import DashboardPage from '@renderer/pages/DashboardPage'
import WorkspacePage from '@renderer/pages/WorkspacePage'
import {
  useWorkspaceStore,
  useAppSettingStore,
  useEnvStore,
  useHistoryStore
} from '@renderer/stores'
import Layout from './components/common/Layout'

/**
 * Inner component that hydrates stores on mount.
 */
function AppBootstrap({ children }: { children: React.ReactNode }): React.JSX.Element {
  const hydrateConfig = useAppSettingStore((s) => s.hydrate)
  const hydrateWorkspaces = useWorkspaceStore((s) => s.hydrate)
  const hydrateEnvs = useEnvStore((s) => s.hydrate)
  const hydrateHistory = useHistoryStore((s) => s.hydrate)

  useEffect(() => {
    void hydrateConfig()
    void hydrateWorkspaces()
    void hydrateEnvs()
    void hydrateHistory()
  }, [hydrateConfig, hydrateWorkspaces, hydrateEnvs, hydrateHistory])

  return <>{children}</>
}

function App(): React.JSX.Element {
  return (
    <I18nProvider>
      <AppThemeProvider>
        <CssBaseline />
        <HashRouter>
          <AppBootstrap>
            <Layout>
              <Routes>
                <Route path="/" element={<DashboardPage />} />
                <Route path="/workspace/:id?" element={<WorkspacePage />} />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </Layout>
          </AppBootstrap>
        </HashRouter>
      </AppThemeProvider>
    </I18nProvider>
  )
}

export default App
