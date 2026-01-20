import React, { useEffect, useMemo, useState } from 'react'
import { lightTheme, darkTheme } from '../themes'
import { ThemeProvider } from '@mui/material/styles'
import { ThemeContext, ThemeMode } from './useThemeMode'

const STORAGE_KEY = 'pigeon:themeMode'

const AppThemeProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [mode, setMode] = useState<ThemeMode>(() => {
    try {
      const v = localStorage.getItem(STORAGE_KEY) as ThemeMode | null
      return v ?? 'system'
    } catch {
      return 'system'
    }
  })

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, mode)
    } catch (err) {
      console.error('Failed to save theme mode to localStorage:', err)
    }
  }, [mode])

  const prefersDark = usePrefersDark()

  const resolvedTheme = useMemo(() => {
    const actual = mode === 'system' ? (prefersDark ? 'dark' : 'light') : mode
    return actual === 'dark' ? darkTheme : lightTheme
  }, [mode, prefersDark])

  return (
    <ThemeContext.Provider value={{ mode, setMode }}>
      <ThemeProvider theme={resolvedTheme}>{children}</ThemeProvider>
    </ThemeContext.Provider>
  )
}

function usePrefersDark(): boolean {
  const [pref, setPref] = useState<boolean>(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') return false
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia === 'undefined') {
      return
    }

    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent): void => setPref(e.matches)

    if ('addEventListener' in mq) {
      mq.addEventListener('change', handler)
    } else {
      ;(
        mq as {
          addListener: (listener: (e: MediaQueryListEvent) => void) => void
        }
      ).addListener(handler)
    }

    return () => {
      if ('removeEventListener' in mq) {
        mq.removeEventListener('change', handler)
      } else {
        ;(
          mq as {
            removeListener: (listener: (e: MediaQueryListEvent) => void) => void
          }
        ).removeListener(handler)
      }
    }
  }, [])

  return pref
}

export default AppThemeProvider
