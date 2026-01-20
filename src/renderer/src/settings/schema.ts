import { useThemeMode, ThemeMode } from '../contexts/useThemeMode'
import { useI18n } from '../contexts/useI18n'

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
  const { t, setLang, lang } = useI18n()

  return [
    {
      key: 'theme',
      title: t('settings.theme.title'),
      description: t('settings.theme.description'),
      type: 'select',
      options: [
        { value: 'light', label: t('theme.option.light') },
        { value: 'dark', label: t('theme.option.dark') },
        { value: 'system', label: t('theme.option.system') }
      ],
      value: mode,
      onChange: (v: unknown) => setMode(v as ThemeMode)
    },
    {
      key: 'language',
      title: t('settings.language.title'),
      description: '',
      type: 'select',
      options: [
        { value: 'en', label: t('language.option.en') },
        { value: 'zh', label: t('language.option.zh') }
      ],
      value: lang,
      onChange: (v: unknown) => setLang(v as 'en' | 'zh')
    }
  ]
}

export default useSettingsSchema
