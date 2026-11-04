import { useNavigate } from 'react-router-dom';
import { Code2, Copy, Globe2, MoreHorizontal, Save, Send, Square } from 'lucide-react';
import type { WorkspaceTab } from '../../stores/tabStore';
import { useTabStore } from '../../stores/tabStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useUiStore } from '../../stores/uiStore';
import { queryRowsFromUrl } from '@shared/utils/url';
import { formatShortcut } from '../../utils/shortcuts';
import { MethodSelect } from './MethodSelect';
import { Menu } from '../common/Menu';
import { Spinner } from '../common/Spinner';
import { useI18n } from '../../i18n';

/** Full-width request bar above the request/response split. */
export function AddressBar({ tab }: { tab: WorkspaceTab }): React.JSX.Element {
  const navigate = useNavigate();
  const update = useTabStore((state) => state.updateDraft);
  const send = useTabStore((state) => state.send);
  const cancel = useTabStore((state) => state.cancel);
  const saveNow = useTabStore((state) => state.saveNow);
  const duplicateTab = useTabStore((state) => state.duplicateTab);
  const shortcuts = useSettingsStore((state) => state.preference.shortcuts);
  const { t } = useI18n();

  const patch = (next: Parameters<typeof update>[1]): void => update(tab.id, next);

  const save = (): void => {
    if (tab.sourceRequestId) void saveNow(tab.id);
    else useUiStore.getState().openSaveRequest(tab.id);
  };

  return (
    <div className="address-bar">
      <MethodSelect value={tab.draft.method} onChange={(method) => patch({ method })} />
      <div className="url-field">
        <input
          className="url-input"
          data-url-input
          value={tab.draft.url}
          placeholder={t('https://api.example.com/v1/resource or {{baseUrl}}/path')}
          onChange={(event) => patch({ url: event.target.value, queryParams: queryRowsFromUrl(event.target.value) })}
          onKeyDown={(event) => {
            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              void send(tab.id);
            }
          }}
          spellCheck={false}
          autoCapitalize="off"
          autoCorrect="off"
        />
        {tab.draft.url.includes('{{') && (
          <span className="url-var-badge" title={t('This URL contains template variables')}>
            {'{{ }}'}
          </span>
        )}
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
          { label: t('Manage environments…'), icon: <Globe2 size={15} />, onSelect: () => navigate('/environments') }
        ]}
      />
    </div>
  );
}
