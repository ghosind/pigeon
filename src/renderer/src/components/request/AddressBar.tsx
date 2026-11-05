import { Check, CircleDashed, Code2, Copy, Globe2, MoreHorizontal, Save, Send, Square } from 'lucide-react';
import type { WorkspaceTab } from '../../stores/tabStore';
import { useTabStore } from '../../stores/tabStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { useEnvStore } from '../../stores/envStore';
import { queryRowsFromUrl } from '@shared/utils/url';
import { formatShortcut } from '../../utils/shortcuts';
import { formatClock } from '../../utils/format';
import { MethodSelect } from './MethodSelect';
import { VariableInput } from '../common/VariableInput';
import { Menu } from '../common/Menu';
import { Spinner } from '../common/Spinner';
import { useI18n } from '../../i18n';

/** Full-width request bar above the request/response split. */
export function AddressBar({ tab }: { tab: WorkspaceTab }): React.JSX.Element {
  const update = useTabStore((state) => state.updateDraft);
  const send = useTabStore((state) => state.send);
  const cancel = useTabStore((state) => state.cancel);
  const saveNow = useTabStore((state) => state.saveNow);
  const duplicateTab = useTabStore((state) => state.duplicateTab);
  const openEnvironmentTab = useTabStore((state) => state.openEnvironmentTab);
  const activeEnvironmentId = useEnvStore((state) => state.environments.find((environment) => environment.isActive)?.id ?? null);
  const shortcuts = useSettingsStore((state) => state.preference.shortcuts);
  const codeSidebarOpen = useUiStore((state) => state.codeSidebarOpen);
  const toggleCodeSidebar = useUiStore((state) => state.toggleCodeSidebar);
  const { t } = useI18n();

  const patch = (next: Parameters<typeof update>[1]): void => update(tab.id, next);
  const stateLabel = tab.sourceRequestId
    ? tab.dirty
      ? t('Unsaved changes')
      : tab.savedAt
        ? t('Saved {time}', { time: formatClock(tab.savedAt) })
        : t('Saved')
    : t('Draft');

  const save = (): void => {
    if (tab.sourceRequestId) void saveNow(tab.id);
    else useUiStore.getState().openSaveRequest(tab.id);
  };

  return (
    <div className="address-region">
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
          <button
            type="button"
            className={`code-pill icon-only ${codeSidebarOpen ? 'active' : ''}`}
            onClick={toggleCodeSidebar}
            title={t('Generate code snippet')}
            aria-label={t('Generate code snippet')}
          >
            <Code2 size={14} />
          </button>
        </div>
      </div>
      <div className="address-bar">
        <MethodSelect value={tab.draft.method} onChange={(method) => patch({ method })} />
        <div className="url-field">
          <VariableInput
            className="url-input"
            fieldClassName="url-variable-field"
            value={tab.draft.url}
            placeholder={t('https://api.example.com/v1/resource or {{baseUrl}}/path')}
            ariaLabel={t('Request URL')}
            dataUrlInput
            onChange={(url) => patch({ url, queryParams: queryRowsFromUrl(url) })}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && !event.shiftKey) {
                event.preventDefault();
                void send(tab.id);
              }
            }}
          />
      </div>
      {tab.sending ? (
        <button type="button" className="send-btn cancel" onClick={() => void cancel(tab.id)}>
          <Spinner size={14} />
          <span>{tab.cancelRequested ? t('Cancelling…') : t('Cancel')}</span>
          <Square size={12} fill="currentColor" />
        </button>
      ) : (
        <button
          type="button"
          className="send-btn"
          onClick={() => void send(tab.id)}
          title={t('Send ({shortcut})', { shortcut: formatShortcut(shortcuts.send) })}
        >
          <Send size={14} />
          <span>{t('Send')}</span>
          <kbd>{formatShortcut(shortcuts.send)}</kbd>
        </button>
      )}
      <Menu
        width={230}
        trigger={
          <button type="button" className="icon-btn more-btn" aria-label={t('Request actions')} title={t('More actions')}>
            <MoreHorizontal size={17} />
          </button>
        }
        items={[
          { label: t('Save'), icon: <Save size={15} />, shortcut: formatShortcut(shortcuts.save), onSelect: save },
          { label: t('Save to collection…'), icon: <Copy size={15} />, onSelect: () => useUiStore.getState().openSaveRequest(tab.id) },
          { label: t('Generate code snippet'), icon: <Code2 size={15} />, onSelect: () => useUiStore.getState().toggleCodeSidebar() },
          { label: t('Duplicate tab'), onSelect: () => duplicateTab(tab.id) },
          { separator: true },
          {
            label: t('Copy URL'),
            icon: <Copy size={15} />,
            onSelect: () => {
              void navigator.clipboard.writeText(tab.draft.url);
              useUiStore.getState().toast('success', t('URL copied'));
            }
          },
          { label: t('Manage environments…'), icon: <Globe2 size={15} />, onSelect: () => openEnvironmentTab(activeEnvironmentId) }
        ]}
      />
      </div>
    </div>
  );
}
