import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Clock3, FolderTree, Plus, Search, Settings2, SlidersHorizontal } from 'lucide-react';
import { useUiStore } from '../../stores/uiStore';
import { useEnvStore } from '../../stores/envStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { useHistoryStore } from '../../stores/historyStore';
import { useTabStore } from '../../stores/tabStore';
import { formatClock } from '../../utils/format';
import { useI18n } from '../../i18n';

interface CommandItem {
  id: string;
  label: string;
  hint?: string;
  icon: React.JSX.Element;
  run: () => void;
}

export function CommandPalette(): React.JSX.Element | null {
  const open = useUiStore((state) => state.commandOpen);
  const setOpen = useUiStore((state) => state.setCommandOpen);
  const requests = useCollectionStore((state) => state.requests);
  const history = useHistoryStore((state) => state.items);
  const openRequest = useTabStore((state) => state.openRequest);
  const openHistory = useTabStore((state) => state.openHistory);
  const openEnvironmentTab = useTabStore((state) => state.openEnvironmentTab);
  const createTab = useTabStore((state) => state.createTab);
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const { t } = useI18n();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setQuery('');
    setActive(0);
    window.setTimeout(() => inputRef.current?.focus(), 20);
  }, [open]);

  const items = useMemo<CommandItem[]>(() => {
    const normalized = query.trim().toLowerCase();
    const results: CommandItem[] = [];
    const actions: CommandItem[] = [
      {
        id: 'new-request',
        label: t('New request'),
        hint: t('Create a blank tab'),
        icon: <Plus size={16} />,
        run: () => createTab()
      },
      {
        id: 'settings',
        label: t('Open settings'),
        hint: t('Preferences'),
        icon: <Settings2 size={16} />,
        run: () => navigate('/settings')
      },
      {
        id: 'environments',
        label: t('Manage environments'),
        hint: t('Variables & secrets'),
        icon: <SlidersHorizontal size={16} />,
        run: () => openEnvironmentTab(useEnvStore.getState().environments.find((environment) => environment.isActive)?.id ?? null)
      }
    ];
    for (const action of actions) {
      if (!normalized || action.label.toLowerCase().includes(normalized)) results.push(action);
    }
    for (const request of requests) {
      if (
        !normalized ||
        request.name.toLowerCase().includes(normalized) ||
        request.url.toLowerCase().includes(normalized)
      ) {
        results.push({
          id: `request-${request.id}`,
          label: request.name,
          hint: request.url,
          icon: <FolderTree size={16} />,
          run: () => openRequest(request)
        });
      }
    }
    for (const record of history.slice(0, 12)) {
      if (!normalized || record.url.toLowerCase().includes(normalized) || record.snapshot.name.toLowerCase().includes(normalized)) {
        results.push({
          id: `history-${record.id}`,
          label: record.snapshot.name,
          hint: `${record.method} ${record.url} · ${formatClock(record.sentAt)}`,
          icon: <Clock3 size={16} />,
          run: () => openHistory(record)
        });
      }
    }
    return results.slice(0, 24);
  }, [query, requests, history, createTab, navigate, openRequest, openHistory]);

  useEffect(() => {
    setActive((index) => Math.min(index, Math.max(0, items.length - 1)));
  }, [items.length]);

  if (!open) return null;

  const choose = (item: CommandItem | undefined): void => {
    if (!item) return;
    setOpen(false);
    item.run();
  };

  return (
    <div className="command-scrim" onMouseDown={(event) => event.target === event.currentTarget && setOpen(false)}>
      <div className="command-palette" role="dialog" aria-label={t('Quick find')}>
        <div className="command-search">
          <Search size={17} />
          <input
            ref={inputRef}
            value={query}
            placeholder={t('Search requests, history or commands…')}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setOpen(false);
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                setActive((index) => (index + 1) % Math.max(1, items.length));
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                setActive((index) => (index - 1 + Math.max(1, items.length)) % Math.max(1, items.length));
              }
              if (event.key === 'Enter') choose(items[active]);
            }}
          />
          <span className="command-esc">ESC</span>
        </div>
        <div className="command-list">
          {items.length === 0 && <div className="command-empty">{t('No matches')}</div>}
          {items.map((item, index) => (
            <button
              type="button"
              key={item.id}
              className={`command-item ${index === active ? 'active' : ''}`}
              onMouseEnter={() => setActive(index)}
              onClick={() => choose(item)}
            >
              <span className="command-icon">{item.icon}</span>
              <span className="command-copy">
                <strong>{item.label}</strong>
                {item.hint && <span>{item.hint}</span>}
              </span>
              <ArrowRight size={14} className="command-arrow" />
            </button>
          ))}
        </div>
        <div className="command-foot">
          <span><kbd>↑</kbd><kbd>↓</kbd> {t('navigate')}</span>
          <span><kbd>↵</kbd> {t('open')}</span>
        </div>
      </div>
    </div>
  );
}
