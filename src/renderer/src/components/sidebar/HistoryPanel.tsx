import { Clock3, FolderPlus, Search, Trash2 } from 'lucide-react';
import type { HistoryRecord } from '@shared/types';
import { useHistoryStore } from '../../stores/historyStore';
import { useTabStore } from '../../stores/tabStore';
import { useUiStore } from '../../stores/uiStore';
import { formatClock, groupByDay, methodTone, statusTone, truncate } from '../../utils/format';
import { EmptyState } from '../common/EmptyState';
import { Spinner } from '../common/Spinner';
import type { MenuAction } from '../common/Menu';
import { Menu } from '../common/Menu';
import { useI18n } from '../../i18n';

export function HistoryPanel(): React.JSX.Element {
  const items = useHistoryStore((state) => state.items);
  const total = useHistoryStore((state) => state.total);
  const loading = useHistoryStore((state) => state.loading);
  const search = useHistoryStore((state) => state.search);
  const setSearch = useHistoryStore((state) => state.setSearch);
  const loadMore = useHistoryStore((state) => state.loadMore);
  const remove = useHistoryStore((state) => state.remove);
  const clear = useHistoryStore((state) => state.clear);
  const openHistory = useTabStore((state) => state.openHistory);
  const { t } = useI18n();

  const groups = groupByDay(items);

  const menuFor = (record: HistoryRecord): MenuAction[] => [
    { label: t('Reopen in a new tab'), onSelect: () => openHistory(record) },
    {
      label: t('Save to collection…'),
      icon: <FolderPlus size={15} />,
      onSelect: () => {
        const tab = openHistory(record);
        useUiStore.getState().openSaveRequest(tab.id);
      }
    },
    { separator: true },
    { label: t('Delete from history'), icon: <Trash2 size={15} />, danger: true, onSelect: () => void remove(record.id) }
  ];

  return (
    <section className="side-panel-inner history-panel">
      <header className="panel-head">
        <span>{t('History')}</span>
        <div className="panel-head-actions">
          <button
            type="button"
            className="mini-btn"
            title={t('Clear history')}
            aria-label={t('Clear history')}
            disabled={total === 0}
            onClick={() =>
              useUiStore.getState().openConfirm({
                title: t('Clear history'),
                message: t('Delete all request history? Collections and environments are unaffected.'),
                confirmLabel: t('Clear history'),
                danger: true,
                onConfirm: clear
              })
            }
          >
            <Trash2 size={15} />
          </button>
        </div>
      </header>
      <div className="panel-search">
        <Search size={14} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Search history')} />
        {search && <button type="button" onClick={() => setSearch('')}>{t('Clear')}</button>}
      </div>
      <div className="panel-scroll">
        {loading && items.length === 0 ? (
          <div className="panel-loading"><Spinner /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Clock3 size={26} />}
            title={search ? t('No matching requests') : t('No history yet')}
            description={search ? t('Try a different search term.') : t('Requests you send will appear here automatically.')}
          />
        ) : (
          groups.map((group) => (
            <div className="history-group" key={group.label}>
              <div className="history-group-label">{t(group.label)}</div>
              {group.items.map((record) => (
                <div
                  key={record.id}
                  className="history-row"
                  onClick={() => openHistory(record)}
                  onContextMenu={(event) => {
                    event.preventDefault();
                    useUiStore.getState().openContextMenu(event.clientX, event.clientY, menuFor(record));
                  }}
                  title={`${record.method} ${record.url}`}
                >
                  <div className="history-top">
                    <span className={`method-chip ${methodTone(record.method)}`}>{record.method}</span>
                    <span className="history-name">{record.snapshot.name || truncate(record.url, 28)}</span>
                    <span className={`status-dot ${statusTone(record.responseMeta.status)}`} />
                  </div>
                  <div className="history-meta">
                    <span className="history-url">{truncate(record.url.replace(/^https?:\/\//, ''), 34)}</span>
                    <span>{formatClock(record.sentAt)}</span>
                  </div>
                  {record.responseMeta.status > 0 && (
                    <span className={`history-status ${statusTone(record.responseMeta.status)}`}>
                      {record.responseMeta.status} · {record.responseMeta.duration} ms
                    </span>
                  )}
                  <Menu
                    className="row-menu history-menu"
                    trigger={<span className="row-more">•••</span>}
                    items={menuFor(record)}
                    width={210}
                  />
                </div>
              ))}
            </div>
          ))
        )}
        {items.length < total && (
          <button type="button" className="load-more" onClick={() => void loadMore()} disabled={loading}>
            {loading ? t('Loading…') : t('Load more ({count})', { count: total - items.length })}
          </button>
        )}
      </div>
    </section>
  );
}
