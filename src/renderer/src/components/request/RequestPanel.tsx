import { useNavigate } from 'react-router-dom';
import { Check, CircleDashed, Code2, Globe2, Terminal } from 'lucide-react';
import type { WorkspaceTab } from '../../stores/tabStore';
import { useTabStore } from '../../stores/tabStore';
import { useEnvStore } from '../../stores/envStore';
import { useUiStore } from '../../stores/uiStore';
import { formatClock } from '../../utils/format';
import { ParamsTab } from './ParamsTab';
import { HeadersTab } from './HeadersTab';
import { BodyTab } from './BodyTab';
import { AuthTab } from './AuthTab';
import { ScriptsTab } from './ScriptsTab';
import { useI18n } from '../../i18n';

const TABS = [
  { id: 'params' as const, label: 'Params' },
  { id: 'headers' as const, label: 'Headers' },
  { id: 'body' as const, label: 'Body' },
  { id: 'auth' as const, label: 'Auth' },
  { id: 'scripts' as const, label: 'Scripts' }
];

export function RequestPanel({ tab }: { tab: WorkspaceTab }): React.JSX.Element {
  const navigate = useNavigate();
  const update = useTabStore((state) => state.updateDraft);
  const setRequestTab = useTabStore((state) => state.setRequestTab);
  const setActiveEnv = useEnvStore((state) => state.activate);
  const environments = useEnvStore((state) => state.environments);
  const activeEnv = environments.find((environment) => environment.isActive);
  const codeSidebarOpen = useUiStore((state) => state.codeSidebarOpen);
  const toggleCodeSidebar = useUiStore((state) => state.toggleCodeSidebar);
  const { t } = useI18n();

  const enabledParams = tab.draft.queryParams.filter((row) => row.enabled && row.key).length;
  const enabledHeaders = tab.draft.headers.filter((row) => row.enabled && row.key).length;
  const hasScripts = Boolean(tab.draft.preRequestScript.trim() || tab.draft.testScript.trim());
  const patch = (next: Parameters<typeof update>[1]): void => update(tab.id, next);

  const stateLabel = tab.sourceRequestId
    ? tab.dirty
      ? t('Unsaved changes')
      : tab.savedAt
        ? t('Saved {time}', { time: formatClock(tab.savedAt) })
        : t('Saved')
    : t('Draft');

  return (
    <section className="request-panel">
      <div className="request-headline">
        <div className="request-title-wrap">
          <span className="request-eyebrow">{t('REQUEST')}</span>
          <input
            className="request-name-input"
            value={tab.draft.name}
            onChange={(event) => patch({ name: event.target.value })}
            aria-label={t('Request name')}
            spellCheck={false}
          />
        </div>
        <div className="request-headline-meta">
          <span className={`save-state ${tab.dirty ? 'dirty' : ''}`}>
            {tab.dirty ? <CircleDashed size={12} /> : <Check size={12} />}
            {stateLabel}
          </span>
          <button type="button" className={`code-pill ${codeSidebarOpen ? 'active' : ''}`} onClick={toggleCodeSidebar} title={t('Generate code snippet')}>
            <Code2 size={13} /> {t('Code')}
          </button>
        </div>
      </div>

      <div className="request-context-row">
        <button type="button" className="env-inline" onClick={() => navigate('/environments')} title={t('Manage environments')}>
          <Globe2 size={12} />
          {activeEnv?.name ?? t('No environment')}
        </button>
        {activeEnv && (
          <button
            type="button"
            className="env-quick"
            onClick={() => {
              const currentIndex = environments.findIndex((environment) => environment.isActive);
              const next = environments[(currentIndex + 1) % environments.length];
              if (next) void setActiveEnv(next.id);
            }}
            title={t('Cycle environment')}
          >
            {t('switch')}
          </button>
        )}
      </div>

      <div className="request-tabs">
        {TABS.map((entry) => {
          const active = tab.requestTab === entry.id;
          const count =
            entry.id === 'params' ? enabledParams
            : entry.id === 'headers' ? enabledHeaders
            : 0;
          const dot =
            (entry.id === 'body' && tab.draft.body.mode !== 'none')
            || (entry.id === 'auth' && tab.draft.auth.type !== 'none')
            || (entry.id === 'scripts' && hasScripts);
          return (
            <button
              key={entry.id}
              type="button"
              className={`request-tab ${active ? 'active' : ''}`}
              onClick={() => setRequestTab(tab.id, entry.id)}
            >
              {t(entry.id === 'body' ? 'request.body' : entry.id === 'headers' ? 'request.headers' : entry.label)}
              {count > 0 && <span className="request-tab-count">{count}</span>}
              {dot && <i className="request-tab-dot" />}
            </button>
          );
        })}
        <div className="request-tabs-fill" />
        {hasScripts && (
          <button type="button" className="script-indicator" onClick={() => setRequestTab(tab.id, 'scripts')} title={t('Scripts configured')}>
            <Terminal size={13} />
          </button>
        )}
      </div>

      <div className="request-pane-scroll">
        {tab.requestTab === 'params' && <ParamsTab tab={tab} update={patch} />}
        {tab.requestTab === 'headers' && <HeadersTab tab={tab} update={patch} />}
        {tab.requestTab === 'body' && <BodyTab tab={tab} update={patch} />}
        {tab.requestTab === 'auth' && <AuthTab tab={tab} update={patch} />}
        {tab.requestTab === 'scripts' && <ScriptsTab tab={tab} update={patch} />}
      </div>
    </section>
  );
}
