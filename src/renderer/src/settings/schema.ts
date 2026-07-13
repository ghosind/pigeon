import { useThemeMode, ThemeMode } from '../contexts/useThemeMode'
import { useI18n } from '../contexts/useI18n'
import { useAppSettingStore } from '../stores/appSettingStore'

import pkg from '../../../../package.json'

export type SelectOption = { value: string; label: string }

export type FieldSchema = {
  key: string
  title: string
  description?: string
  type: 'select' | 'text' | 'number' | 'boolean' | 'action' | 'info' | 'shortcut'
  options?: SelectOption[]
  value: unknown
  onChange: (v: unknown) => void
  /** For 'action' type — label of the action button */
  actionLabel?: string
  /** For 'info' type — informational text lines */
  infoLines?: string[]
}

export type SettingsSection = {
  key: string
  title: string
  fields: FieldSchema[]
}

export function useSettingsSchema(): SettingsSection[] {
  const { mode, setMode } = useThemeMode()
  const { t, setLang, lang } = useI18n()
  const { config, updateConfig, saveConfig } = useAppSettingStore()

  /** Update config and auto-persist to DB. */
  const updateAndSave = (partial: Partial<typeof config>): void => {
    updateConfig(partial)
    void saveConfig()
  }

  const sections: SettingsSection[] = [
    // ── General ────────────────────────────────────────────────────────
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
          key: 'fontSize',
          title: t('settings.fontSize'),
          type: 'number',
          value: config.fontSize,
          onChange: (v: unknown) => updateAndSave({ fontSize: Number(v) })
        },
        {
          key: 'timeout',
          title: t('settings.timeout'),
          type: 'number',
          value: config.timeout,
          onChange: (v: unknown) => updateAndSave({ timeout: Number(v) })
        },
        {
          key: 'sslVerify',
          title: t('settings.sslVerify'),
          type: 'boolean',
          value: !config.ignoreSSL,
          onChange: (v: unknown) => updateAndSave({ ignoreSSL: !v })
        },
        {
          key: 'history.saveResponse',
          title: t('settings.history.saveResponse.title'),
          description: t('settings.history.saveResponse.description'),
          type: 'boolean',
          value: config.saveResponseInHistory,
          onChange: (v: unknown) => updateAndSave({ saveResponseInHistory: Boolean(v) })
        }
      ]
    },

    // ── Interface / Theme ──────────────────────────────────────────────
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
    },

    // ── Shortcuts ──────────────────────────────────────────────────────
    {
      key: 'shortcuts',
      title: t('settings.shortcuts'),
      fields: [
        {
          key: 'shortcut.sendRequest',
          title: t('settings.sendRequest'),
          type: 'shortcut',
          value: config.shortcuts?.sendRequest || 'Ctrl+Enter',
          onChange: (v: unknown) =>
            updateAndSave({ shortcuts: { ...config.shortcuts!, sendRequest: String(v) } })
        },
        {
          key: 'shortcut.createRequest',
          title: t('settings.createRequest'),
          type: 'shortcut',
          value: config.shortcuts?.createRequest || 'Ctrl+T',
          onChange: (v: unknown) =>
            updateAndSave({ shortcuts: { ...config.shortcuts!, createRequest: String(v) } })
        },
        {
          key: 'shortcut.closeRequest',
          title: t('settings.closeRequest'),
          type: 'shortcut',
          value: config.shortcuts?.closeRequest || 'Ctrl+W',
          onChange: (v: unknown) =>
            updateAndSave({ shortcuts: { ...config.shortcuts!, closeRequest: String(v) } })
        },
        {
          key: 'shortcut.toggleLeft',
          title: t('settings.toggleLeftSidebar'),
          type: 'shortcut',
          value: config.shortcuts?.toggleLeftSidebar || 'Ctrl+B',
          onChange: (v: unknown) =>
            updateAndSave({ shortcuts: { ...config.shortcuts!, toggleLeftSidebar: String(v) } })
        },
        {
          key: 'shortcut.toggleRight',
          title: t('settings.toggleRightSidebar'),
          type: 'shortcut',
          value: config.shortcuts?.toggleRightSidebar || 'Ctrl+Shift+C',
          onChange: (v: unknown) =>
            updateAndSave({ shortcuts: { ...config.shortcuts!, toggleRightSidebar: String(v) } })
        },
        {
          key: 'resetShortcuts',
          title: '',
          type: 'action',
          actionLabel: t('settings.resetShortcuts'),
          value: null,
          onChange: () =>
            updateAndSave({
              shortcuts: {
                sendRequest: 'Ctrl+Enter',
                createRequest: 'Ctrl+T',
                closeRequest: 'Ctrl+W',
                toggleLeftSidebar: 'Ctrl+B',
                toggleRightSidebar: 'Ctrl+Shift+C'
              }
            })
        }
      ]
    },

    // ── About ──────────────────────────────────────────────────────────
    {
      key: 'about',
      title: t('settings.about'),
      fields: [
        {
          key: 'about.info',
          title: t('settings.aboutPigeon'),
          type: 'info',
          infoLines: [
            `${pkg.description || ''}`,
            t('settings.about.version', { version: pkg.version || '0.0.0' }),
            t('settings.about.author', { author: pkg.author || '-' }),
            t('settings.about.license', { license: pkg.license || '-' })
          ],
          value: null,
          onChange: () => {}
        }
      ]
    }
  ]

  return sections
}

export default useSettingsSchema
