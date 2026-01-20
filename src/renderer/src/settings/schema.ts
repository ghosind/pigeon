import { useThemeMode, ThemeMode } from '../contexts/useThemeMode'

export type SelectOption = { value: string; label: string }

export type FieldSchema = {
  key: string
  title: string
  description?: string
  type: 'select' | 'text' | 'number' | 'boolean'
  options?: SelectOption[]
  value: unknown
  onChange: (v: unknown) => void
}

export function useSettingsSchema(): FieldSchema[] {
  const { mode, setMode } = useThemeMode()

  return [
    {
      key: 'theme',
      title: 'Theme',
      description: 'Choose the display theme for the application',
      type: 'select',
      options: [
        { value: 'light', label: 'Light' },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'System' }
      ],
      value: mode,
      onChange: (v: unknown) => setMode(v as ThemeMode)
    }
  ]
}

export default useSettingsSchema
