import { useEffect, useMemo, useState } from 'react';
import { Check, Code2, Copy, X } from 'lucide-react';
import type { WorkspaceTab } from '../../stores/tabStore';
import { useUiStore } from '../../stores/uiStore';
import { useI18n } from '../../i18n';
import { generateCodeSnippets } from '../../utils/codegen';
import { CodeEditor } from '../common/CodeEditor';
import { Button, IconButton } from '../common/Button';

export function CodeSidebar({ tab }: { tab: WorkspaceTab }): React.JSX.Element {
  const close = useUiStore((state) => state.setCodeSidebarOpen);
  const width = useUiStore((state) => state.codeSidebarWidth);
  const setWidth = useUiStore((state) => state.setCodeSidebarWidth);
  const toast = useUiStore((state) => state.toast);
  const { t } = useI18n();
  const snippets = useMemo(() => generateCodeSnippets(tab.draft), [tab.draft]);
  const [selectedId, setSelectedId] = useState('curl');
  const [copied, setCopied] = useState(false);
  const selected = snippets.find((snippet) => snippet.id === selectedId) ?? snippets[0];

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') close(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [close]);

  const copy = async (): Promise<void> => {
    await navigator.clipboard.writeText(selected.code);
    setCopied(true);
    toast('success', t('Code snippet copied'), selected.label);
    window.setTimeout(() => setCopied(false), 1600);
  };

  const beginResize = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const startX = event.clientX;
    const startWidth = width;
    const move = (moveEvent: PointerEvent): void => setWidth(startWidth - (moveEvent.clientX - startX));
    const up = (): void => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
      document.body.classList.remove('resizing-horizontal');
    };
    document.body.classList.add('resizing-horizontal');
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  };

  return (
    <aside className="code-sidebar" style={{ width }} aria-label={t('Code snippet')}>
      <div className="code-sidebar-resizer" onPointerDown={beginResize} role="separator" aria-orientation="vertical" />
      <header className="code-sidebar-head">
        <div className="code-sidebar-title">
          <Code2 size={16} />
          <div>
            <strong>{t('Code snippet')}</strong>
            <span>{t('Generated from the current request draft.')}</span>
          </div>
        </div>
        <IconButton label={t('Close')} onClick={() => close(false)}>
          <X size={16} />
        </IconButton>
      </header>

      <div className="code-sidebar-controls">
        <label htmlFor="code-language">{t('Language')}</label>
        <select
          id="code-language"
          className="select-input select-sm"
          value={selected.id}
          onChange={(event) => setSelectedId(event.target.value)}
        >
          {snippets.map((snippet) => (
            <option value={snippet.id} key={snippet.id}>{snippet.label}</option>
          ))}
        </select>
      </div>

      <div className="code-sidebar-editor">
        <CodeEditor
          value={selected.code}
          language={selected.language}
          readOnly
          height="100%"
          path={`snippet-${selected.id}`}
        />
      </div>

      <footer className="code-sidebar-foot">
        <span>{t('Variables stay as {{placeholders}}.')}</span>
        <Button variant="primary" size="sm" icon={copied ? <Check size={14} /> : <Copy size={14} />} onClick={() => void copy()}>
          {copied ? t('Copied') : t('Copy code')}
        </Button>
      </footer>
    </aside>
  );
}
