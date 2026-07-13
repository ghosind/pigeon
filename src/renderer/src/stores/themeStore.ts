/**
 * themeStore — manages application theme (light/dark/system).
 */

import { create } from 'zustand'

export type ThemeMode = 'light' | 'dark' | 'system'

export interface ThemeState {
  mode: ThemeMode
  setMode: (mode: ThemeMode) => void
}

export const useThemeStore = create<ThemeState>((set) => ({
  mode: (() => {
    try {
      const v = localStorage.getItem('pigeon:themeMode') as ThemeMode | null
      return v ?? 'system'
    } catch {
      return 'system'
    }
  })(),

  setMode: (mode) => {
    try {
      localStorage.setItem('pigeon:themeMode', mode)
    } catch {
      // silently handled
    }
    set({ mode })
  }
}))
