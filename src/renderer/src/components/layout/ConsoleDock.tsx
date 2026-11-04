import { useEffect, useRef } from 'react';
import { CircleDot, Eraser, Terminal, TriangleAlert, X } from 'lucide-react';
import { useConsoleStore } from '../../stores/consoleStore';
import { useEnvStore } from '../../stores/envStore';
import { useWorkspaceStore } from '../../stores/workspaceStore';
import { formatBytes, formatClock, formatDuration, methodTone, statusTone } from '../../utils/format';
import { IconButton } from '../common/Button';
import { useI18n } from '../../i18n';

export function ConsoleDock(): React.JSX.Element | null {
  const visible = useConsoleStore((state) => state.visible);
  const entries = useConsoleStore((state) => state.entries);
  const filter = useConsoleStore((state) => state.filter);
  const setFilter = useConsoleStore((state) => state.setFilter);
  const clear = useConsoleStore((state) => state.clear);
  const setVisible = useConsoleStore((state) => state.setVisible);
  const bottomRef = useRef<HTMLDivElement>(null);
  const { t } = useI18n();
  const shown = filter === 'errors' ? entries.filter((entry) => entry.level === 'error' || entry.level === 'warn') : entries;

  useEffect(() => {
    if (visible) bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [entries, visible]);

  if (!visible) return null;

  return (
    <section className="console-dock">
      <header className="console-dock-head">
        <div className="console-dock-title">
          <Terminal size={14} />
          <strong>{t('Console')}</strong>
          <span>{entries.length}</span>
        </div>
        <div className="console-dock-actions">
          <div className="segmented segmented-sm">
            <button type="button" className={filter === 'all' ? 'active' : ''} onClick={() => setFilter('all')}>{t('All')}</button>
            <button type="button" className={filter === 'errors' ? 'active' : ''} onClick={() => setFilter('errors')}>{t('Errors')}</button>
          </div>
          <button type="button" className="link-btn" onClick={clear} disabled={entries.length === 0}>
            <Eraser size={13} /> {t('Clear')}
          </button>
          <IconButton label={t('Close console')} onClick={() => setVisible(false)}><X size={15} /></IconButton>
        </div>
      </header>
      <div className="console-dock-body">
        {shown.length === 0 ? (
          <div className="console-dock-empty">
            <Terminal size={22} />
            <span>{t('Request lifecycle and script logs will appear here.')}</span>
          </div>
        ) : (
          shown.map((entry) => (
            <div className={`console-dock-row level-${entry.level}`} key={entry.id} title={entry.detail}>
              <span className="console-dock-time">{formatClock(entry.timestamp)}</span>
              <span className={`console-dock-level ${entry.level}`}>{entry.level.toUpperCase()}</span>
              {entry.method ? (
                <span className={`method-chip ${methodTone(entry.method)}`}>{entry.method}</span>
              ) : (
                <span className="console-dock-method-placeholder" />
              )}
              {typeof entry.status === 'number' && (
                <span className={`console-dock-status ${statusTone(entry.status)}`}>{entry.status}</span>
              )}
              <span className="console-dock-message">
                {entry.message}
                {entry.url && <em>{entry.url}</em>}
                {entry.detail && entry.level === 'error' && <small>{entry.detail}</small>}
              </span>
              {typeof entry.durationMs === 'number' && (
                <span className="console-dock-meta">
                  {formatDuration(entry.durationMs)}
                  {typeof entry.sizeBytes === 'number' ? ` · ${formatBytes(entry.sizeBytes)}` : ''}
                </span>
              )}
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </section>
  );
}

export function WorkspaceStatusBar(): React.JSX.Element {
  const entries = useConsoleStore((state) => state.entries);
  const visible = useConsoleStore((state) => state.visible);
  const toggle = useConsoleStore((state) => state.toggle);
  const workspace = useWorkspaceStore((state) => state.workspaces.find((entry) => entry.isActive));
  const environment = useEnvStore((state) => state.environments.find((entry) => entry.isActive));
  const errors = entries.filter((entry) => entry.level === 'error').length;
  const { t } = useI18n();

  return (
    <footer className="workspace-statusbar">
      <button type="button" className={`statusbar-console-btn ${visible ? 'active' : ''}`} onClick={toggle}>
        <Terminal size={13} />
        <span>{t('Console')}</span>
        {entries.length > 0 && <b>{entries.length}</b>}
        {errors > 0 && <span className="statusbar-errors"><TriangleAlert size={11} /> {errors}</span>}
      </button>
      <span className="statusbar-divider" />
      <span className="statusbar-item"><CircleDot size={11} /> {workspace?.name ?? t('Workspace')}</span>
      <span className="statusbar-item">{environment?.name ?? t('No environment')}</span>
      <span className="statusbar-fill" />
      <span className="statusbar-item muted">{t('Local-first · v0.1.0')}</span>
    </footer>
  );
}
