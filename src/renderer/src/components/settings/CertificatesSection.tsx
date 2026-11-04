import { Plus, ShieldCheck, Trash2 } from 'lucide-react';
import type { ClientCertItem } from '@shared/types';
import { Button } from '../common/Button';
import { Switch } from '../common/Switch';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { FieldGroup, SectionTitle, SettingRow } from './shared';
import { useI18n } from '../../i18n';

export function CertificatesSection(): React.JSX.Element {
  const preference = useSettingsStore((state) => state.preference);
  const setPreference = useSettingsStore((state) => state.setPreference);
  const toast = useUiStore((state) => state.toast);
  const { t } = useI18n();

  const addCaPath = async (): Promise<void> => {
    const result = await window.pigeon.settings.pickFile({
      title: t('Choose a CA certificate'),
      filters: [{ name: 'Certificates', extensions: ['pem', 'crt', 'cer', 'key'] }]
    });
    if (result.ok && result.data) {
      setPreference({ ssl: { ...preference.ssl, caPaths: [...preference.ssl.caPaths, result.data] } });
    } else if (!result.ok) {
      toast('error', t('Unable to add certificate'), result.error.message);
    }
  };

  const addClientCert = (): void => {
    const cert: ClientCertItem = { host: '', kind: 'pem', certPath: '', keyPath: '', passphrase: '' };
    setPreference({ ssl: { ...preference.ssl, clientCerts: [...preference.ssl.clientCerts, cert] } });
  };

  const updateClientCert = (index: number, patch: Partial<ClientCertItem>): void => {
    const next = preference.ssl.clientCerts.map((cert, certIndex) => (certIndex === index ? { ...cert, ...patch } : cert));
    setPreference({ ssl: { ...preference.ssl, clientCerts: next } });
  };

  const pickCertPath = async (index: number, field: 'certPath' | 'keyPath'): Promise<void> => {
    const result = await window.pigeon.settings.pickFile({
      title: field === 'certPath' ? t('Choose client certificate') : t('Choose private key'),
      filters: [{ name: 'Certificates', extensions: ['pem', 'crt', 'cer', 'key', 'pfx', 'p12'] }]
    });
    if (result.ok && result.data) updateClientCert(index, { [field]: result.data });
  };

  return (
    <>
      <SectionTitle title={t('Certificates & TLS')} description={t('Custom CAs and mutual TLS client certificates.')} />
      <SettingRow title={t('Verify TLS certificates')} description={t('Disable only for trusted development servers. This weakens transport security.')}>
        <Switch
          danger
          checked={!preference.ssl.rejectUnauthorized}
          onChange={(insecure) => setPreference({ ssl: { ...preference.ssl, rejectUnauthorized: !insecure } })}
          label="Skip certificate verification"
        />
      </SettingRow>
      {!preference.ssl.rejectUnauthorized && (
        <div className="settings-warning danger">
          <ShieldCheck size={16} />
          <span>{t('Certificate verification is OFF. Connections may be vulnerable to interception. This setting applies to all HTTPS requests.')}</span>
        </div>
      )}
      <FieldGroup label={t('Custom CA certificates')} hint={t('PEM bundles trusted in addition to the system store.')}>
        <div className="path-list">
          {preference.ssl.caPaths.map((path, index) => (
            <div className="path-row" key={`${path}-${index}`}>
              <ShieldCheck size={14} />
              <span>{path}</span>
              <button
                type="button"
                className="icon-btn icon-btn-danger"
                aria-label={t('Remove CA')}
                onClick={() =>
                  setPreference({ ssl: { ...preference.ssl, caPaths: preference.ssl.caPaths.filter((_entry, i) => i !== index) } })
                }
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
          {preference.ssl.caPaths.length === 0 && <p className="form-hint">{t('No custom CA bundles.')}</p>}
          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={() => void addCaPath()}>
            {t('Add CA bundle')}
          </Button>
        </div>
      </FieldGroup>
      <FieldGroup label={t('Client certificates')} hint={t('Matched by hostname. Use *.example.com for a wildcard.')}>
        <div className="cert-list">
          {preference.ssl.clientCerts.map((cert, index) => (
            <div className="cert-card" key={index}>
              <div className="cert-head">
                <strong>{t('Certificate {index}', { index: index + 1 })}</strong>
                <button
                  type="button"
                  className="icon-btn icon-btn-danger"
                  aria-label={t('Remove client certificate')}
                  onClick={() =>
                    setPreference({
                      ssl: { ...preference.ssl, clientCerts: preference.ssl.clientCerts.filter((_entry, i) => i !== index) }
                    })
                  }
                >
                  <Trash2 size={14} />
                </button>
              </div>
              <div className="settings-grid">
                <label className="field-stack">
                  <span className="field-label">{t('Host pattern')}</span>
                  <input
                    className="text-input mono-input"
                    value={cert.host}
                    placeholder="api.example.com"
                    onChange={(event) => updateClientCert(index, { host: event.target.value })}
                  />
                </label>
                <label className="field-stack">
                  <span className="field-label">{t('Format')}</span>
                  <select
                    className="select-input"
                    value={cert.kind}
                    onChange={(event) => updateClientCert(index, { kind: event.target.value as 'pem' | 'pfx' })}
                  >
                    <option value="pem">PEM</option>
                    <option value="pfx">PFX / P12</option>
                  </select>
                </label>
              </div>
              <div className="cert-path-row">
                <input
                  className="text-input mono-input"
                  value={cert.certPath}
                  placeholder={cert.kind === 'pfx' ? 'Certificate .pfx path' : 'Certificate .pem path'}
                  onChange={(event) => updateClientCert(index, { certPath: event.target.value })}
                />
                <Button size="sm" variant="secondary" onClick={() => void pickCertPath(index, 'certPath')}>{t('Choose')}</Button>
              </div>
              {cert.kind === 'pem' && (
                <div className="cert-path-row">
                  <input
                    className="text-input mono-input"
                    value={cert.keyPath ?? ''}
                    placeholder={t('Private key path')}
                    onChange={(event) => updateClientCert(index, { keyPath: event.target.value })}
                  />
                  <Button size="sm" variant="secondary" onClick={() => void pickCertPath(index, 'keyPath')}>{t('Choose')}</Button>
                </div>
              )}
              <input
                className="text-input mono-input"
                type="password"
                value={cert.passphrase ?? ''}
                placeholder={t('Passphrase (optional, encrypted at rest)')}
                onChange={(event) => updateClientCert(index, { passphrase: event.target.value })}
              />
            </div>
          ))}
          <Button size="sm" variant="secondary" icon={<Plus size={13} />} onClick={addClientCert}>{t('Add client certificate')}</Button>
        </div>
      </FieldGroup>
    </>
  );
}
