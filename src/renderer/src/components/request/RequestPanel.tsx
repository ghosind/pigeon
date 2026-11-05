import { Terminal } from 'lucide-react';
import type { WorkspaceTab } from '../../stores/tabStore';
import { useTabStore } from '../../stores/tabStore';
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
  const update = useTabStore((state) => state.updateDraft);
  const setRequestTab = useTabStore((state) => state.setRequestTab);
  const { t } = useI18n();

  const hasScripts = Boolean(tab.draft.preRequestScript.trim() || tab.draft.testScript.trim());
  const patch = (next: Parameters<typeof update>[1]): void => update(tab.id, next);

  return (
    <section className="request-panel">
      <div className="request-tabs">
        {TABS.map((entry) => {
          const active = tab.requestTab === entry.id;
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

      <div className={`request-pane-scroll ${tab.requestTab === 'body' && tab.draft.body.mode === 'raw' ? 'body-raw-active' : ''}`}>
        {tab.requestTab === 'params' && <ParamsTab tab={tab} update={patch} />}
        {tab.requestTab === 'headers' && <HeadersTab tab={tab} update={patch} />}
        {tab.requestTab === 'body' && <BodyTab tab={tab} update={patch} />}
        {tab.requestTab === 'auth' && <AuthTab tab={tab} update={patch} />}
        {tab.requestTab === 'scripts' && <ScriptsTab tab={tab} update={patch} />}
      </div>
    </section>
  );
}
