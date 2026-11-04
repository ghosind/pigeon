import { useSettingsStore } from '../../stores/settingsStore';
import { Switch } from '../common/Switch';
import { FieldGroup, NumberField, SectionTitle, SettingRow } from './shared';
import { useI18n } from '../../i18n';

export function RequestDefaultsSection(): React.JSX.Element {
  const preference = useSettingsStore((state) => state.preference);
  const setPreference = useSettingsStore((state) => state.setPreference);
  const { t } = useI18n();

  return (
    <>
      <SectionTitle title={t('Request defaults')} description={t('Limits applied to every request unless overridden.')} />
      <div className="settings-stack">
        <NumberField label={t('Timeout')} suffix="ms" value={preference.timeoutMs} min={100} max={600000} step={1000} onChange={(timeoutMs) => setPreference({ timeoutMs })} />
        <NumberField label={t('Max response size')} suffix="MB" value={preference.maxResponseSizeMb} min={1} max={500} onChange={(maxResponseSizeMb) => setPreference({ maxResponseSizeMb })} />
        <NumberField label={t('Script timeout')} suffix="ms" value={preference.scriptTimeoutMs} min={100} max={30000} step={500} onChange={(scriptTimeoutMs) => setPreference({ scriptTimeoutMs })} />
        <NumberField label={t('History entries')} value={preference.historyLimit} min={10} max={10000} step={10} onChange={(historyLimit) => setPreference({ historyLimit })} />
      </div>
      <FieldGroup label={t('Redirects')}>
        <SettingRow title={t('Follow redirects')} description={t('Automatically follow 3xx responses. Authorization is stripped across origins.')}>
          <Switch checked={preference.followRedirect} onChange={(followRedirect) => setPreference({ followRedirect })} label="Follow redirects" />
        </SettingRow>
        {preference.followRedirect && (
          <SettingRow title={t('Maximum redirects')} description={t('Stop after this many hops.')}>
            <input
              type="number"
              className="number-input"
              min={0}
              max={50}
              value={preference.maxRedirects}
              onChange={(event) => setPreference({ maxRedirects: Number(event.target.value) })}
            />
          </SettingRow>
        )}
      </FieldGroup>
      <FieldGroup label={t('Default body mode')}>
        <select
          className="select-input"
          value={preference.defaultBodyMode}
          onChange={(event) => setPreference({ defaultBodyMode: event.target.value as typeof preference.defaultBodyMode })}
        >
          <option value="none">{t('None')}</option>
          <option value="raw">{t('Raw')}</option>
          <option value="formdata">{t('Form data')}</option>
          <option value="urlencoded">{t('URL encoded')}</option>
          <option value="binary">{t('Binary')}</option>
        </select>
      </FieldGroup>
    </>
  );
}
