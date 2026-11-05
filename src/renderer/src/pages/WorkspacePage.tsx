import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Download, FolderTree, Keyboard, Sparkles, Upload, Zap } from 'lucide-react';
import { TopBar } from '../components/layout/TopBar';
import { Sidebar } from '../components/layout/Sidebar';
import { TabStrip } from '../components/tabs/TabStrip';
import { AddressBar } from '../components/request/AddressBar';
import { RequestPanel } from '../components/request/RequestPanel';
import { ResponsePanel } from '../components/response/ResponsePanel';
import { useActiveTab, useTabStore } from '../stores/tabStore';
import { useCollectionStore } from '../stores/collectionStore';
import { useUiStore } from '../stores/uiStore';
import { useSettingsStore } from '../stores/settingsStore';
import { useHistoryStore } from '../stores/historyStore';
import { matchesShortcut } from '../utils/shortcuts';
import { methodTone } from '../utils/format';
import { unwrap } from '../utils/api';
import { Logo } from '../components/common/Logo';
import { useI18n } from '../i18n';
import { ConsoleDock, WorkspaceStatusBar } from '../components/layout/ConsoleDock';
import { CodeSidebar } from '../components/request/CodeSidebar';
import { FolderSettingsPanel } from '../components/folder/FolderSettingsPanel';
import { EnvironmentSettingsPanel } from '../components/environment/EnvironmentSettingsPanel';

export function WorkspacePage(): React.JSX.Element {
  const tab = useActiveTab();
  const responseWidth = useUiStore((state) => state.responseWidth);
  const codeSidebarOpen = useUiStore((state) => state.codeSidebarOpen);
  const setResponseWidth = useUiStore((state) => state.setResponseWidth);
  const shortcuts = useSettingsStore((state) => state.preference.shortcuts);
  const requests = useCollectionStore((state) => state.requests);
  const loaded = useCollectionStore((state) => state.loaded);
  const autoOpened = useRef(false);
  const layoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoOpened.current || !loaded || requests.length === 0) return;
    if (useTabStore.getState().tabs.length === 0) {
      autoOpened.current = true;
      useTabStore.getState().openRequest(requests[0]);
    }
  }, [loaded, requests]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent): void => {
      const ui = useUiStore.getState();
      if (ui.prompt || ui.confirm || ui.saveRequestTabId) return;
      const isCommand = (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k';
      if (isCommand) {
        event.preventDefault();
        ui.setCommandOpen(true);
        return;
      }
      const active = useTabStore.getState().tabs.find((entry) => entry.id === useTabStore.getState().activeTabId);
      if (matchesShortcut(event, shortcuts.send) && active?.kind === 'request') {
        event.preventDefault();
        void useTabStore.getState().send(active.id);
        return;
      }
      if (matchesShortcut(event, shortcuts.newTab)) {
        event.preventDefault();
        useTabStore.getState().createTab();
        return;
      }
      if (matchesShortcut(event, shortcuts.closeTab) && active) {
        event.preventDefault();
        useTabStore.getState().requestCloseTab(active.id);
        return;
      }
      if (matchesShortcut(event, shortcuts.save) && active?.kind === 'request') {
        event.preventDefault();
        if (active.sourceRequestId) void useTabStore.getState().saveNow(active.id);
        else ui.openSaveRequest(active.id);
        return;
      }
      if (matchesShortcut(event, shortcuts.focusUrl)) {
        event.preventDefault();
        document.querySelector<HTMLInputElement>('[data-url-input]')?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [shortcuts]);

  const beginResize = (event: React.PointerEvent<HTMLDivElement>): void => {
    event.preventDefault();
    const rect = layoutRef.current?.getBoundingClientRect();
    if (!rect) return;
    const move = (moveEvent: PointerEvent): void => {
      const percent = ((rect.right - moveEvent.clientX) / rect.width) * 100;
      setResponseWidth(percent);
    };
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
    <div className="app-shell">
      <TopBar />
      <div className="workspace-body">
        <Sidebar />
        <main className="work-main">
          <TabStrip />
          <div className="work-stage">
          {tab?.kind === 'folder' ? (
            <FolderSettingsPanel
              id={tab.folderId ?? ''}
              onClose={() => useTabStore.getState().closeTab(tab.id)}
            />
          ) : tab?.kind === 'environment' ? (
            <EnvironmentSettingsPanel
              environmentId={tab.environmentId ?? null}
              onClose={() => useTabStore.getState().closeTab(tab.id)}
            />
          ) : (
          <div className={`workspace-columns ${codeSidebarOpen && tab ? 'with-code' : ''}`}>
          {tab ? (
            <div className="work-editor">
              <AddressBar tab={tab} />
              <div
                className="editor-layout left-right"
                ref={layoutRef}
                style={{ gridTemplateColumns: `minmax(340px, 1fr) 7px minmax(330px, ${responseWidth}%)` }}
              >
                <div className="request-region"><RequestPanel tab={tab} /></div>
                <div className="split-handle vertical" onPointerDown={beginResize} role="separator" aria-orientation="vertical">
                  <span />
                </div>
                <div className="response-region"><ResponsePanel tab={tab} /></div>
              </div>
            </div>
          ) : (
            <WelcomeView />
          )}
          {tab?.kind === 'request' && codeSidebarOpen && <CodeSidebar tab={tab} />}
          </div>
          )}
          </div>
          <ConsoleDock />
          <WorkspaceStatusBar />
        </main>
      </div>
    </div>
  );
}

function WelcomeView(): React.JSX.Element {
  const navigate = useNavigate();
  const { t } = useI18n();
  const requests = useCollectionStore((state) => state.requests);
  const history = useHistoryStore((state) => state.items);
  const createTab = useTabStore((state) => state.createTab);
  const openRequest = useTabStore((state) => state.openRequest);
  const openHistory = useTabStore((state) => state.openHistory);
  const toast = useUiStore((state) => state.toast);

  const importPostman = async (): Promise<void> => {
    try {
      const result = await unwrap(window.pigeon.transfer.importPostman());
      if (!result) return;
      await useCollectionStore.getState().load();
      toast('success', t('Postman collection imported'));
    } catch (error) {
      toast('error', t('Import failed'), error instanceof Error ? error.message : String(error));
    }
  };

  return (
    <div className="welcome">
      <div className="welcome-grid" />
      <div className="welcome-main">
        <div className="welcome-mark"><Logo size={44} /></div>
        <span className="welcome-kicker">{t('LOCAL-FIRST API STUDIO')}</span>
        <h1>{t('Make requests.')}<br /><em>{t('Keep the data.')}</em></h1>
        <p className="welcome-lead">
          {t('A fast, private API workbench for HTTP, scripts and environments. No account required — everything is stored locally on this machine.')}
        </p>
        <div className="welcome-actions">
          <button type="button" className="btn btn-primary" onClick={() => createTab()}>
            <Zap size={15} /> {t('New request')}
          </button>
          <button type="button" className="btn btn-secondary" onClick={() => void importPostman()}>
            <Upload size={15} /> {t('Import Postman')}
          </button>
          <button type="button" className="btn btn-ghost" onClick={() => navigate('/settings')}>
            <Sparkles size={15} /> {t('Configure')}
          </button>
        </div>
        <div className="welcome-shortcuts">
          <span><Keyboard size={13} /> <kbd>⌘K</kbd> {t('quick find')}</span>
          <span><kbd>⌘</kbd><kbd>↵</kbd> {t('send')}</span>
          <span><kbd>⌘</kbd><kbd>T</kbd> {t('new tab')}</span>
        </div>

        {requests.length > 0 && (
          <div className="welcome-recent">
            <div className="welcome-section-head">
              <h3>{t('Start from your workspace')}</h3>
              <span>{t('{count} requests', { count: requests.length })}</span>
            </div>
            <div className="quick-list">
              {requests.slice(0, 4).map((request) => (
                <button type="button" key={request.id} className="quick-request" onClick={() => openRequest(request)}>
                  <span className={`method-chip ${methodTone(request.method)}`}>{request.method}</span>
                  <span className="quick-name">{request.name}</span>
                  <span className="quick-url">{request.url}</span>
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>
        )}

        {history.length > 0 && (
          <div className="welcome-try">
            <span>{t('Pick up where you left off')}</span>
            <button type="button" onClick={() => openHistory(history[0])}>
              {history[0].snapshot.name} <ArrowRight size={13} />
            </button>
          </div>
        )}
      </div>

      <aside className="welcome-aside">
        <div className="welcome-card">
          <FolderTree size={18} />
          <h4>{t('Collections that stay yours')}</h4>
          <p>{t('Nested folders, scripts and request history in a single portable local file.')}</p>
        </div>
        <div className="welcome-card">
          <Download size={18} />
          <h4>{t('Postman compatible')}</h4>
          <p>{t('Import Collection v2.1 and environments. Export any time. No lock-in.')}</p>
        </div>
        <div className="welcome-privacy">
          <span className="privacy-dot" />
          <div>
            <strong>{t('Offline by default')}</strong>
            <span>{t('No telemetry. No auto upload.')}</span>
          </div>
        </div>
      </aside>
    </div>
  );
}
