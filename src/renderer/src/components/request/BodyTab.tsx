import { FileUp, Braces, Wand2, X } from 'lucide-react';
import type { BodyMode } from '@shared/types';
import type { WorkspaceTab } from '../../stores/tabStore';
import { asApiCallError } from '../../utils/api';
import { useUiStore } from '../../stores/uiStore';
import { CodeEditor } from '../common/CodeEditor';
import { KeyValueEditor } from './KeyValueEditor';
import { useI18n } from '../../i18n';

const MODES: Array<{ id: BodyMode; label: string }> = [
  { id: 'none', label: 'None' },
  { id: 'formdata', label: 'Form data' },
  { id: 'urlencoded', label: 'URL encoded' },
  { id: 'raw', label: 'Raw' },
  { id: 'binary', label: 'Binary' }
];

export function BodyTab({
  tab,
  update
}: {
  tab: WorkspaceTab;
  update: (patch: Partial<WorkspaceTab['draft']>) => void;
}): React.JSX.Element {
  const { t } = useI18n();
  const body = tab.draft.body;
  const setBody = (patch: Partial<WorkspaceTab['draft']['body']>): void => {
    update({ body: { ...body, ...patch } });
  };

  const chooseBinary = async (): Promise<void> => {
    const result = await window.pigeon.settings.pickFile({ title: t('Choose a binary body') });
    if (result.ok && result.data) setBody({ binaryFilePath: result.data });
    else if (!result.ok) useUiStore.getState().toast('error', t('Unable to choose file'), asApiCallError(result.error.message).message);
  };

  const formatJson = (): void => {
    try {
      setBody({ raw: JSON.stringify(JSON.parse(body.raw ?? ''), null, 2) });
    } catch {
      useUiStore.getState().toast('warning', t('Body is not valid JSON'));
    }
  };

  const jsonError = (() => {
    if (body.mode !== 'raw' || body.rawLanguage !== 'json' || !(body.raw ?? '').trim()) return null;
    try {
      JSON.parse(body.raw ?? '');
      return null;
    } catch (error) {
      return error instanceof Error ? error.message : 'Invalid JSON';
    }
  })();

  return (
    <div className="tab-pane body-pane">
      <div className="body-modebar">
        <div className="segmented">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              className={body.mode === mode.id ? 'active' : ''}
              onClick={() => setBody({ mode: mode.id })}
            >
              {t(mode.label)}
            </button>
          ))}
        </div>
        {body.mode === 'raw' && (
          <div className="body-raw-tools">
            <select
              className="select-input select-sm"
              value={body.rawLanguage ?? 'json'}
              onChange={(event) => setBody({ rawLanguage: event.target.value as 'json' | 'xml' | 'text' })}
            >
              <option value="json">{t('JSON')}</option>
              <option value="xml">{t('XML')}</option>
              <option value="text">{t('Text')}</option>
            </select>
            {body.rawLanguage === 'json' && (
              <button type="button" className="btn btn-secondary btn-sm" onClick={formatJson}>
                <Wand2 size={13} /> Format
              </button>
            )}
          </div>
        )}
      </div>

      {body.mode === 'none' && (
        <div className="body-empty">
          <Braces size={22} />
          <h4>{t('This request has no body')}</h4>
          <p>{t('Choose a body type above when you need to send data.')}</p>
        </div>
      )}

      {body.mode === 'raw' && (
        <div className="body-raw">
          <CodeEditor
            value={body.raw ?? ''}
            onChange={(raw) => setBody({ raw })}
            language={body.rawLanguage === 'xml' ? 'xml' : body.rawLanguage === 'text' ? 'plaintext' : 'json'}
            height={286}
            path={`request-body-${tab.id}.${body.rawLanguage ?? 'json'}`}
          />
          <div className="body-status">
            <span>Content-Type: {body.rawLanguage === 'json' ? 'application/json' : body.rawLanguage === 'xml' ? 'application/xml' : 'text/plain'}</span>
            {jsonError ? <span className="body-error">{t('Invalid JSON')} · {jsonError}</span> : body.rawLanguage === 'json' && (body.raw ?? '').trim() ? <span className="body-valid">{t('Valid JSON')}</span> : null}
          </div>
        </div>
      )}

      {body.mode === 'formdata' && (
        <KeyValueEditor
          rows={body.formdata ?? []}
          allowFiles
          keyPlaceholder={t('Field')}
          valuePlaceholder={t('Value')}
          descriptionPlaceholder={t('Description')}
          onChange={(formdata) => setBody({ formdata })}
        />
      )}

      {body.mode === 'urlencoded' && (
        <KeyValueEditor
          rows={body.urlencoded ?? []}
          keyPlaceholder={t('Field')}
          valuePlaceholder={t('Value')}
          descriptionPlaceholder={t('Description')}
          onChange={(urlencoded) => setBody({ urlencoded })}
        />
      )}

      {body.mode === 'binary' && (
        <div className="binary-drop">
          {body.binaryFilePath ? (
            <div className="binary-file">
              <FileUp size={22} />
              <div>
                <strong>{body.binaryFilePath.split(/[\\/]/).pop()}</strong>
                <span>{body.binaryFilePath}</span>
              </div>
              <button type="button" className="icon-btn icon-btn-danger" onClick={() => setBody({ binaryFilePath: '' })} aria-label={t('Remove file')}>
                <X size={15} />
              </button>
            </div>
          ) : (
            <>
              <FileUp size={26} />
              <h4>{t('Choose a file to send')}</h4>
              <p>{t('The file is read from disk and streamed to the request engine.')}</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={() => void chooseBinary()}>
                {t('Choose file')}
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
