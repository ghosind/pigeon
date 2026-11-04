import { Monitor, Moon, Sun } from 'lucide-react';
import type { LanguagePreference, ThemePreference } from '@shared/types';
import { Switch } from '../common/Switch';
import { useSettingsStore } from '../../stores/settingsStore';
import { FieldGroup, SectionTitle, SettingRow } from './shared';
import { useI18n } from '../../i18n';

export function AppearanceSection(): React.JSX.Element {
  const preference = useSettingsStore((state) => state.preference);
  const setPreference = useSettingsStore((state) => state.setPreference);
  const setTheme = useSettingsStore((state) => state.setTheme);
  const { t } = useI18n();

  return (
    <>
      <SectionTitle title={t('Appearance')} description={t('Theme and editor density.')} />
      <FieldGroup label={t('Theme')}>
        <div className="theme-grid">
          {([
            { id: 'light', label: 'Light', icon: Sun },
            { id: 'dark', label: 'Dark', icon: Moon },
            { id: 'system', label: 'System', icon: Monitor }
          ] as Array<{ id: ThemePreference; label: string; icon: typeof Sun }>).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              className={`theme-card ${preference.theme === id ? 'active' : ''}`}
              onClick={() => setTheme(id)}
            >
              <span className={`theme-preview preview-${id}`}><i /><i /><i /></span>
              <span><Icon size={15} /> {t(label)}</span>
            </button>
          ))}
        </div>
      </FieldGroup>
      <FieldGroup label={t('Language')} hint={t('Choose the interface language.')}>
        <select
          className="select-input"
          value={preference.language}
          onChange={(event) => setPreference({ language: event.target.value as LanguagePreference })}
        >
          <option value="system">{t('System')}</option>
          <option value="en">{t('English')}</option>
          <option value="zh-CN">{t('简体中文')}</option>
        </select>
      </FieldGroup>
      <FieldGroup label={t('Editor font size')} hint={t('Applies to request bodies, scripts and response previews.')}>
        <div className="range-row">
          <input
            type="range"
            min={10}
            max={22}
            value={preference.editorFontSize}
            onChange={(event) => setPreference({ editorFontSize: Number(event.target.value) })}
          />
          <span className="range-value">{preference.editorFontSize}px</span>
        </div>
      </FieldGroup>
      <FieldGroup label={t('Word wrap')}>
        <SettingRow title={t('Wrap long lines')} description={t('Wrap request and response editors to the panel width.')}>
          <Switch checked={preference.wordWrap} onChange={(wordWrap) => setPreference({ wordWrap })} label="Word wrap" />
        </SettingRow>
      </FieldGroup>
    </>
  );
}
