import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Folder, Globe2, Layers, Plus, Settings2, X } from 'lucide-react';
import { useTabStore, type WorkspaceTab } from '../../stores/tabStore';
import { useUiStore } from '../../stores/uiStore';
import { useEnvStore } from '../../stores/envStore';
import { useCollectionStore } from '../../stores/collectionStore';
import { methodTone } from '../../utils/format';
import { Menu, type MenuAction } from '../common/Menu';
import { useI18n } from '../../i18n';

interface DropTarget {
  id: string;
  before: boolean;
}

export function TabStrip(): React.JSX.Element {
  const tabs = useTabStore((state) => state.tabs);
  const activeTabId = useTabStore((state) => state.activeTabId);
  const activate = useTabStore((state) => state.activate);
  const reorderTabs = useTabStore((state) => state.reorderTabs);
  const requestCloseTab = useTabStore((state) => state.requestCloseTab);
  const closeOthers = useTabStore((state) => state.closeOthers);
  const duplicateTab = useTabStore((state) => state.duplicateTab);
  const createTab = useTabStore((state) => state.createTab);
  const openEnvironmentTab = useTabStore((state) => state.openEnvironmentTab);
  const saveNow = useTabStore((state) => state.saveNow);
  const nodes = useCollectionStore((state) => state.nodes);
  const environments = useEnvStore((state) => state.environments);
  const activateEnvironment = useEnvStore((state) => state.activate);
  const activeEnvironment = environments.find((environment) => environment.isActive);
  const stripRef = useRef<HTMLDivElement>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);
  const { t } = useI18n();

  useEffect(() => {
    const active = stripRef.current?.querySelector<HTMLElement>('.tab.active');
    active?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [activeTabId]);

  const menuFor = (tab: WorkspaceTab): MenuAction[] =>
    tab.kind !== 'request'
      ? [
          { label: t('Close'), onSelect: () => requestCloseTab(tab.id) },
          { label: t('Close others'), onSelect: () => closeOthers(tab.id) }
        ]
      : [
          { label: t('Duplicate'), onSelect: () => duplicateTab(tab.id) },
          {
            label: t('Save'),
            onSelect: () => {
              if (tab.sourceRequestId) void saveNow(tab.id);
              else useUiStore.getState().openSaveRequest(tab.id);
            }
          },
          { label: t('Save to collection…'), onSelect: () => useUiStore.getState().openSaveRequest(tab.id) },
          { separator: true },
          { label: t('Close'), onSelect: () => requestCloseTab(tab.id) },
          { label: t('Close others'), onSelect: () => closeOthers(tab.id) }
        ];

  const dropOn = (event: React.DragEvent<HTMLDivElement>, tab: WorkspaceTab): void => {
    event.preventDefault();
    if (draggingId && draggingId !== tab.id) {
      reorderTabs(draggingId, tab.id, dropTarget?.before ?? true);
    }
    setDraggingId(null);
    setDropTarget(null);
  };

  return (
    <div className="tab-strip-wrap">
      <div className="tab-strip" ref={stripRef}>
        {tabs.map((tab) => {
          const dropClass =
            dropTarget?.id === tab.id ? (dropTarget.before ? 'drop-before' : 'drop-after') : '';
          const folder = tab.kind === 'folder' ? nodes.find((node) => node.id === tab.folderId) : undefined;
          const environment = tab.kind === 'environment'
            ? tab.environmentId === null
              ? { name: t('Global variables') }
              : environments.find((entry) => entry.id === tab.environmentId)
            : undefined;
          const title = folder?.name ?? environment?.name ?? tab.draft.name;
          return (
            <div
              key={tab.id}
              className={`tab ${tab.id === activeTabId ? 'active' : ''} ${tab.kind === 'request' && tab.dirty ? 'dirty' : ''} ${
                draggingId === tab.id ? 'dragging' : ''
              } ${dropClass}`}
              draggable
              onClick={() => activate(tab.id)}
              onDragStart={(event) => {
                setDraggingId(tab.id);
                event.dataTransfer.effectAllowed = 'move';
                event.dataTransfer.setData('text/plain', tab.id);
              }}
              onDragOver={(event) => {
                if (!draggingId || draggingId === tab.id) return;
                event.preventDefault();
                event.dataTransfer.dropEffect = 'move';
                const rect = event.currentTarget.getBoundingClientRect();
                setDropTarget({ id: tab.id, before: event.clientX < rect.left + rect.width / 2 });
              }}
              onDragLeave={() => {
                setDropTarget((current) => (current?.id === tab.id ? null : current));
              }}
              onDrop={(event) => dropOn(event, tab)}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTarget(null);
              }}
              onAuxClick={(event) => {
                if (event.button === 1) requestCloseTab(tab.id);
              }}
              onContextMenu={(event) => {
                event.preventDefault();
                useUiStore.getState().openContextMenu(event.clientX, event.clientY, menuFor(tab));
              }}
              title={tab.kind === 'request' ? `${tab.draft.method} ${tab.draft.url}` : title}
            >
              {tab.kind === 'folder' ? (
                <Folder size={13} className="tab-folder-icon" />
              ) : tab.kind === 'environment' ? (
                tab.environmentId === null
                  ? <Layers size={13} className="tab-folder-icon" />
                  : <Globe2 size={13} className="tab-folder-icon" />
              ) : (
                <span className={`method-chip ${methodTone(tab.draft.method)}`}>{tab.draft.method}</span>
              )}
              <span className="tab-name">{title}</span>
              {tab.kind === 'request' && tab.dirty && <span className="tab-dirty" title={t('Unsaved changes')} />}
              <button
                type="button"
                className="tab-close"
                onClick={(event) => {
                  event.stopPropagation();
                  requestCloseTab(tab.id);
                }}
                aria-label={t('Close tab')}
              >
                <X size={13} />
              </button>
            </div>
          );
        })}
      </div>
      <button type="button" className="tab-add" onClick={() => createTab()} aria-label={t('New request tab')} title={t('New request')}>
        <Plus size={16} />
      </button>
      <Menu
        className="tab-switcher"
        width={280}
        trigger={
          <button type="button" className="tab-list-btn" aria-label={t('All tabs')} title={t('All tabs')}>
            <ChevronDown size={15} />
          </button>
        }
        items={[
          ...tabs.map((tab) => ({
            label: tab.kind === 'folder'
              ? nodes.find((node) => node.id === tab.folderId)?.name ?? tab.draft.name
              : tab.kind === 'environment'
                ? tab.environmentId === null
                  ? t('Global variables')
                  : environments.find((entry) => entry.id === tab.environmentId)?.name ?? tab.draft.name
                : tab.draft.name,
            icon: tab.kind === 'folder'
              ? <Folder size={14} />
              : tab.kind === 'environment'
                ? tab.environmentId === null ? <Layers size={14} /> : <Globe2 size={14} />
                : <span className={`method-chip ${methodTone(tab.draft.method)}`}>{tab.draft.method}</span>,
            shortcut: tab.id === activeTabId ? t('Active') : undefined,
            onSelect: () => activate(tab.id)
          })),
          ...(tabs.length > 0 ? [{ separator: true } as MenuAction] : []),
          { label: t('New request tab'), icon: <Plus size={15} />, onSelect: () => createTab() }
        ]}
      />
      <Menu
        className="tab-env-menu"
        width={240}
        trigger={
          <button type="button" className="tab-env-trigger" title={t('Environment')} aria-label={t('Environment')}>
            <Globe2 size={13} />
            <span>{activeEnvironment?.name ?? t('No environment')}</span>
            <ChevronDown size={12} />
          </button>
        }
        items={[
          ...environments.map((environment) => ({
            label: environment.name,
            icon: environment.id === activeEnvironment?.id ? <Check size={14} /> : <Globe2 size={14} />,
            onSelect: () => void activateEnvironment(environment.id)
          })),
          ...(environments.length > 0 ? [{ separator: true } as MenuAction] : []),
          { label: t('Manage environments…'), icon: <Settings2 size={14} />, onSelect: () => openEnvironmentTab(activeEnvironment?.id ?? null) }
        ]}
      />
    </div>
  );
}
