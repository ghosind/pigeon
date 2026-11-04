import { useMemo } from 'react';
import { Copy } from 'lucide-react';
import type { ResponseResult } from '@shared/types';
import { useUiStore } from '../../stores/uiStore';
import { useI18n } from '../../i18n';

export function ResponseHeaders({ response }: { response: ResponseResult }): React.JSX.Element {
  const toast = useUiStore((state) => state.toast);
  const { t } = useI18n();
  const entries = useMemo(
    () => Object.entries(response.headers).sort(([a], [b]) => a.localeCompare(b)),
    [response.headers]
  );
  const requestEntries = Object.entries(response.requestHeaders).sort(([a], [b]) => a.localeCompare(b));

  const copyAll = (): void => {
    const text = entries.map(([key, values]) => `${key}: ${values.join(', ')}`).join('\n');
    void navigator.clipboard.writeText(text);
    toast('success', t('Response headers copied'));
  };

  return (
    <div className="headers-view">
      <div className="headers-toolbar">
        <span>{t('{count} response headers', { count: entries.length })}</span>
        <button type="button" className="link-btn" onClick={copyAll}><Copy size={13} /> {t('Copy all')}</button>
      </div>
      <div className="headers-table">
        {entries.length === 0 && <p className="panel-note">{t('No response headers.')}</p>}
        {entries.map(([key, values]) => (
          <div className="header-line" key={key}>
            <span className="header-key">{key}</span>
            <span className="header-value">{values.join(', ')}</span>
          </div>
        ))}
      </div>
      <details className="request-headers-block">
        <summary>{t('Sent request headers')} <span>{requestEntries.length}</span></summary>
        <div className="headers-table">
          {requestEntries.map(([key, value]) => (
            <div className="header-line" key={key}>
              <span className="header-key">{key}</span>
              <span className="header-value">{value}</span>
            </div>
          ))}
        </div>
      </details>
    </div>
  );
}
