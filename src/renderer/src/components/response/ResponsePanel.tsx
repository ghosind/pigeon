import { Copy, Download, FlaskConical, Radio, RotateCcw, Send, Terminal, AlertTriangle } from 'lucide-react';
import type { WorkspaceTab } from '../../stores/tabStore';
import { useTabStore } from '../../stores/tabStore';
import { useUiStore } from '../../stores/uiStore';
import { formatBytes, formatClock, formatDuration, statusTone, suggestFileName } from '../../utils/format';
import { Spinner } from '../common/Spinner';
import { ResponseBody } from './ResponseBody';
import { ResponseHeaders } from './ResponseHeaders';
import { ResponseConsole } from './ResponseConsole';
import { ResponseTests } from './ResponseTests';
import { useI18n } from '../../i18n';

export function ResponsePanel({ tab }: { tab: WorkspaceTab }): React.JSX.Element {
  const setResponseTab = useTabStore((state) => state.setResponseTab);
  const setBodyView = useTabStore((state) => state.setResponseBodyView);
  const send = useTabStore((state) => state.send);
  const toast = useUiStore((state) => state.toast);
  const response = tab.response;
  const { t } = useI18n();

  const saveResponse = async (): Promise<void> => {
    if (!response?.bodyId) return;
    const result = await window.pigeon.response.saveAs({
      bodyId: response.bodyId,
      suggestedName: suggestFileName(response.finalUrl, response.contentType)
    });
    if (result.ok && result.data) toast('success', t('Response saved'), result.data);
    else if (!result.ok) toast('error', t('Unable to save response'), result.error.message);
  };

  const copySummary = async (): Promise<void> => {
    if (!response) return;
    const text = response.bodyText ?? response.bodyPreview ?? '';
    await navigator.clipboard.writeText(text);
    toast('success', t('Response body copied'), response.bodyText ? undefined : t('Only the visible preview was copied.'));
  };

  return (
    <section className="response-panel">
      <header className="response-head">
        <div className="response-title">
          <Radio size={14} />
          <span>{t('Response')}</span>
          {tab.sending && <Spinner size={12} />}
        </div>
        {response && (
          <div className="response-stats">
            <span className={`status-pill ${statusTone(response.status)}`}>
              <i />
              {response.status} {response.statusText}
            </span>
            <span className="stat"><b>{formatDuration(response.durationMs)}</b></span>
            <span className="stat"><b>{formatBytes(response.sizeBytes)}</b></span>
            <span className="stat muted">{formatClock(response.receivedAt)}</span>
            {response.redirects.length > 0 && (
              <span className="stat redirect-stat" title={response.redirects.map((hop) => `${hop.status} → ${hop.url}`).join('\n')}>
                {t('{count} redirects', { count: response.redirects.length })}
              </span>
            )}
            {response.httpVersion && <span className="stat muted">HTTP/{response.httpVersion}</span>}
          </div>
        )}
        <div className="response-head-actions">
          {response && (
            <>
              <button type="button" className="tool-btn" title={t('Copy response body')} onClick={() => void copySummary()}>
                <Copy size={14} />
              </button>
              <button type="button" className="tool-btn" title={t('Save response')} onClick={() => void saveResponse()}>
                <Download size={14} />
              </button>
            </>
          )}
        </div>
      </header>

      {tab.sending && !response && (
        <div className="response-loading">
          <div className="response-loading-inner">
            <Spinner size={20} />
            <strong>{t('Waiting for response…')}</strong>
            <span>{tab.draft.method} {tab.draft.url || 'request'}</span>
          </div>
          <div className="loading-skeleton">
            <span /><span /><span /><span />
          </div>
        </div>
      )}

      {!tab.sending && !response && tab.error && (
        <div className="response-error">
          <div className="error-mark"><AlertTriangle size={22} /></div>
          <div className="error-copy">
            <span className="error-code">{tab.error.code.replace(/_/g, ' ')}</span>
            <h3>{tab.error.message}</h3>
            {tab.error.details && <pre>{tab.error.details}</pre>}
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => void send(tab.id)}>
              <RotateCcw size={14} /> {t('Retry')}
            </button>
          </div>
        </div>
      )}

      {!tab.sending && !response && !tab.error && (
        <div className="response-empty">
          <div className="response-empty-art">
            <Send size={24} />
            <span className="orbit orbit-one" />
            <span className="orbit orbit-two" />
          </div>
          <h3>{t('Ready when you are')}</h3>
          <p>{t('Send a request to inspect the status, headers, body and script output here.')}</p>
          <div className="response-empty-shortcuts">
            <span><kbd>⌘</kbd><kbd>↵</kbd> {t('Send')}</span>
            <span><kbd>⌘</kbd><kbd>K</kbd> {t('Quick find')}</span>
          </div>
        </div>
      )}

      {response && (
        <>
          {tab.error && (
            <div className="inline-error"><AlertTriangle size={14} /> {tab.error.message}</div>
          )}
          <div className="response-tabs">
            <button
              type="button"
              className={tab.responseTab === 'body' ? 'active' : ''}
              onClick={() => setResponseTab(tab.id, 'body')}
            >
              {t('response.body')}
              {response.sizeBytes > 0 && <span>{formatBytes(response.sizeBytes)}</span>}
            </button>
            <button
              type="button"
              className={tab.responseTab === 'headers' ? 'active' : ''}
              onClick={() => setResponseTab(tab.id, 'headers')}
            >
              {t('response.headers')} <span>{Object.keys(response.headers).length}</span>
            </button>
            <button
              type="button"
              className={tab.responseTab === 'console' ? 'active' : ''}
              onClick={() => setResponseTab(tab.id, 'console')}
            >
              <Terminal size={12} /> {t('Console')} {response.consoleLogs.length > 0 && <span>{response.consoleLogs.length}</span>}
            </button>
            <button
              type="button"
              className={tab.responseTab === 'tests' ? 'active' : ''}
              onClick={() => setResponseTab(tab.id, 'tests')}
            >
              <FlaskConical size={12} /> {t('Tests')} {response.testResults.length > 0 && <span>{response.testResults.length}</span>}
            </button>
            <div className="response-tabs-fill" />
            {response.contentType && <span className="response-content-type">{response.contentType.split(';')[0]}</span>}
          </div>
          <div className="response-content">
            {tab.responseTab === 'body' && (
              <ResponseBody
                response={response}
                view={tab.responseBodyView}
                onViewChange={(view) => setBodyView(tab.id, view)}
              />
            )}
            {tab.responseTab === 'headers' && <ResponseHeaders response={response} />}
            {tab.responseTab === 'console' && <ResponseConsole response={response} />}
            {tab.responseTab === 'tests' && <ResponseTests response={response} />}
          </div>
        </>
      )}
    </section>
  );
}
