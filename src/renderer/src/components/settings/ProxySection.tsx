import { Server } from 'lucide-react';
import { useSettingsStore } from '../../stores/settingsStore';
import { Switch } from '../common/Switch';
import { FieldGroup, SectionTitle, SettingRow } from './shared';
import { useI18n } from '../../i18n';

export function ProxySection(): React.JSX.Element {
  const preference = useSettingsStore((state) => state.preference);
  const setPreference = useSettingsStore((state) => state.setPreference);
  const { t } = useI18n();

  return (
    <>
      <SectionTitle title={t('Proxy')} description={t('Route main-process traffic through a local or corporate proxy.')} />
      <FieldGroup>
        <SettingRow title={t('Use a proxy')} description={t('Applies to all HTTP requests. System mode uses the operating system proxy configuration.')}>
          <Switch
            checked={preference.proxy.enable}
            onChange={(enable) => setPreference({ proxy: { ...preference.proxy, enable } })}
            label="Enable proxy"
          />
        </SettingRow>
      </FieldGroup>
      {preference.proxy.enable && (
        <>
          <FieldGroup label={t('Proxy mode')}>
            <div className="radio-row">
              <label>
                <input
                  type="radio"
                  checked={preference.proxy.mode === 'system'}
                  onChange={() => setPreference({ proxy: { ...preference.proxy, mode: 'system' } })}
                />
                {t('System proxy')}
              </label>
              <label>
                <input
                  type="radio"
                  checked={preference.proxy.mode === 'custom'}
                  onChange={() => setPreference({ proxy: { ...preference.proxy, mode: 'custom' } })}
                />
                {t('Custom')}
              </label>
            </div>
          </FieldGroup>
          {preference.proxy.mode === 'custom' && (
            <FieldGroup label={t('Proxy URL')} hint={t('Examples: http://127.0.0.1:8080, socks5://127.0.0.1:1080')}>
              <input
                className="text-input mono-input"
                value={preference.proxy.customUrl ?? ''}
                placeholder="http://127.0.0.1:8080"
                onChange={(event) => setPreference({ proxy: { ...preference.proxy, customUrl: event.target.value } })}
                spellCheck={false}
              />
            </FieldGroup>
          )}
          <div className="settings-warning">
            <Server size={16} />
            <span>{t('Proxied traffic leaves this machine through the configured endpoint. Only use proxies you trust.')}</span>
          </div>
        </>
      )}
    </>
  );
}
