import { useEffect, useRef, useState } from 'react';
import type { editor } from 'monaco-editor';
import type { ResponseResult } from '@shared/types';
import type { ResponseBodyView } from '../../stores/tabStore';
import { AlertTriangle, Copy, Download, FileWarning, Image as ImageIcon, Loader2, Search, WrapText } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { detectLanguage, formatBytes, prettyBody, suggestFileName } from '../../utils/format';
import { CodeEditor } from '../common/CodeEditor';
import { useI18n } from '../../i18n';

const CHUNK = 512 * 1024;

export function ResponseBody({
  response,
  view,
  onViewChange
}: {
  response: ResponseResult;
  view: ResponseBodyView;
  onViewChange: (view: ResponseBodyView) => void;
}): React.JSX.Element {
  const toast = useUiStore((state) => state.toast);
  const { t } = useI18n();
  const [loadedText, setLoadedText] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [wrap, setWrap] = useState(false);
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);

  useEffect(() => {
    setLoadedText(null);
    setLoading(false);
  }, [response.bodyId]);

  const fullLength = response.bodyTextLength;
  const partial = typeof response.bodyText !== 'string' && !response.isBinary;
  const text = loadedText ?? response.bodyText ?? response.bodyPreview ?? '';
  const language = detectLanguage(response.contentType, text);
  const canPreview = language === 'html' || response.contentType.includes('html');

  const loadFull = async (): Promise<void> => {
    if (loading || !response.bodyId) return;
    setLoading(true);
    try {
      let offset = 0;
      let accumulated = '';
      let total = fullLength;
      while (offset < total) {
        const result = await window.pigeon.response.readText({ bodyId: response.bodyId, offset, length: CHUNK });
        if (!result.ok) throw new Error(result.error.message);
        if (!result.data.text) break;
        accumulated += result.data.text;
        offset = result.data.nextOffset;
        total = result.data.totalLength;
      }
      setLoadedText(accumulated);
    } catch (error) {
      toast('error', t('Unable to load response body'), error instanceof Error ? error.message : String(error));
    } finally {
      setLoading(false);
    }
  };

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(text);
    toast('success', t('Response body copied'));
  };

  const save = async (): Promise<void> => {
    if (!response.bodyId) return;
    try {
      const result = await window.pigeon.response.saveAs({
        bodyId: response.bodyId,
        suggestedName: suggestFileName(response.finalUrl, response.contentType)
      });
      if (result.ok && result.data) toast('success', t('Response saved'), result.data);
      else if (!result.ok) toast('error', t('Unable to save response'), result.error.message);
    } catch (error) {
      toast('error', t('Unable to save response'), error instanceof Error ? error.message : String(error));
    }
  };

  if (response.isBinary) {
    return (
      <div className="response-binary">
        <div className="binary-card">
          {response.imageDataUrl ? (
            <img src={response.imageDataUrl} alt="Response preview" />
          ) : (
            <ImageIcon size={34} />
          )}
          <div>
            <h4>{response.imageDataUrl ? t('Image response') : t('Binary response')}</h4>
            <p>{response.contentType || 'application/octet-stream'} · {formatBytes(response.sizeBytes)}</p>
            <span>{t('The body is stored locally and is not rendered as text.')}</span>
          </div>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => void save()}>
            <Download size={14} /> {t('Save to file')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="response-body">
      <div className="response-body-toolbar">
        <div className="segmented segmented-sm">
          <button type="button" className={view === 'pretty' ? 'active' : ''} onClick={() => onViewChange('pretty')}>{t('Pretty')}</button>
          <button type="button" className={view === 'raw' ? 'active' : ''} onClick={() => onViewChange('raw')}>{t('Raw')}</button>
          {canPreview && (
            <button type="button" className={view === 'preview' ? 'active' : ''} onClick={() => onViewChange('preview')}>{t('Preview')}</button>
          )}
        </div>
        <div className="response-body-tools">
          <span className="response-body-lang">{language.toUpperCase()}</span>
          <button type="button" className={`tool-btn ${wrap ? 'active' : ''}`} onClick={() => setWrap((value) => !value)} title={t('Toggle word wrap')}>
            <WrapText size={14} />
          </button>
          <button
            type="button"
            className="tool-btn"
            title={t('Find in response')}
            onClick={() => {
              editorRef.current?.focus();
              void editorRef.current?.getAction('actions.find')?.run();
            }}
          >
            <Search size={14} />
          </button>
          <button type="button" className="tool-btn" title={t('Copy body')} onClick={() => void copy()}>
            <Copy size={14} />
          </button>
          <button type="button" className="tool-btn" title={t('Save body')} onClick={() => void save()}>
            <Download size={14} />
          </button>
        </div>
      </div>

      {partial && (
        <div className="body-partial-banner">
          <FileWarning size={14} />
          <span>
            {t('Previewing the first {shown} of {total}.', { shown: formatBytes(Math.min(64 * 1024, response.sizeBytes)), total: formatBytes(response.sizeBytes) })}
          </span>
          <button type="button" onClick={() => void loadFull()} disabled={loading}>
            {loading ? <><Loader2 size={13} className="spin" /> {t('Loading…')}</> : t('Load full response')}
          </button>
        </div>
      )}

      {response.truncated && (
        <div className="body-partial-banner warning">
          <AlertTriangle size={14} />
          <span>{t('Response was truncated at the configured maximum size. Increase the limit in Settings → Request defaults.')}</span>
        </div>
      )}

      {view === 'preview' && canPreview ? (
        <div className="html-preview">
          <iframe title={t('HTML response preview')} sandbox="" srcDoc={text} />
          {partial && <span className="preview-note">{t('Preview uses the partial body. Load the full response for complete rendering.')}</span>}
        </div>
      ) : (
        <CodeEditor
          value={view === 'pretty' ? prettyBody(text, language) : text}
          language={view === 'pretty' ? (language === 'json' ? 'json' : language === 'xml' ? 'xml' : language === 'html' ? 'html' : 'plaintext') : 'plaintext'}
          readOnly
          height="100%"
          wordWrap={wrap}
          path={`response-${response.bodyId}-${view}`}
          onMount={(instance) => {
            editorRef.current = instance;
          }}
        />
      )}
    </div>
  );
}
