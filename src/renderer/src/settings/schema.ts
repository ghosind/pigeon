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

export type SettingsSection = {
  key: string
  title: string
  fields: FieldSchema[]
}

export function useSettingsSchema(): SettingsSection[] {
  const { mode, setMode } = useThemeMode()
  const { t, setLang, lang } = useI18n()

  const sections: SettingsSection[] = [
    {
      key: 'general',
      title: t('settings.menu.general'),
      fields: [
        {
          key: 'language',
          title: t('settings.language.title'),
          description: t('settings.language.description'),
          type: 'select',
          options: [
            { value: 'en', label: t('language.option.en') },
            { value: 'zh', label: t('language.option.zh') }
          ],
          value: lang,
          onChange: (v: unknown) => setLang(v as 'en' | 'zh')
        },
        {
          key: 'history.saveResponse',
          title: t('settings.history.saveResponse.title'),
          description: t('settings.history.saveResponse.description'),
          type: 'boolean',
          value: (() => {
            try {
              const v = localStorage.getItem('pigeon:history.saveResponse')
              return v === null ? true : v === 'true'
            } catch (e: unknown) {
              console.error('Failed to read history.saveResponse setting', e)
              return true
            }
          })(),
          onChange: (v: unknown) => {
            try {
              localStorage.setItem('pigeon:history.saveResponse', String(Boolean(v)))
            } catch (e) {
              console.error('Failed to save history.saveResponse setting', e)
            }
          }
        }
      ]
    },
    {
      key: 'interface',
      title: t('settings.menu.interface'),
      fields: [
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
        }
      ]
    }
  ]

  return sections
}

export default useSettingsSchema
