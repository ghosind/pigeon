import { useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Folder,
  FolderClosed,
  FolderPlus,
  FolderTree,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Trash2,
  Download,
  Play
} from 'lucide-react';
import type { CollectionNode, SavedRequest } from '@shared/types';
import { createEmptyBody } from '@shared/defaults';
import { useCollectionStore } from '../../stores/collectionStore';
import { useSettingsStore } from '../../stores/settingsStore';
import { useTabStore } from '../../stores/tabStore';
import { useUiStore } from '../../stores/uiStore';
import { buildTree, siblingsFor, type TreeItem } from '../../utils/tree';
import { asApiCallError, unwrap } from '../../utils/api';
import { methodTone } from '../../utils/format';
import { Menu, type MenuAction } from '../common/Menu';
import { EmptyState } from '../common/EmptyState';
import { Spinner } from '../common/Spinner';
import { useI18n } from '../../i18n';

interface DragPayload {
  id: string;
  kind: 'node' | 'request';
}

type DropTarget = { id: string; position: 'inside' | 'before' | 'after' } | null;

function filterTree(items: TreeItem[], search: string): TreeItem[] {
  const value = search.toLowerCase();
  if (!value) return items;
  const result: TreeItem[] = [];
  for (const item of items) {
    if (item.kind === 'request') {
      if (item.request.name.toLowerCase().includes(value) || item.request.url.toLowerCase().includes(value)) result.push(item);
      continue;
    }
    const children = filterTree(item.children, search);
    if (item.node.name.toLowerCase().includes(value) || children.length > 0) {
      result.push({ ...item, children });
    }
  }
  return result;
}

export function CollectionsPanel(): React.JSX.Element {
  const nodes = useCollectionStore((state) => state.nodes);
  const requests = useCollectionStore((state) => state.requests);
  const tree = useMemo(() => buildTree(nodes, requests), [nodes, requests]);
  const loading = useCollectionStore((state) => state.loading);
  const expanded = useCollectionStore((state) => state.expanded);
  const search = useCollectionStore((state) => state.search);
  const setSearch = useCollectionStore((state) => state.setSearch);
  const toggleExpanded = useCollectionStore((state) => state.toggleExpanded);
  const expand = useCollectionStore((state) => state.expand);
  const selectedId = useCollectionStore((state) => state.selectedId);
  const setSelected = useCollectionStore((state) => state.setSelected);
  const createNode = useCollectionStore((state) => state.createNode);
  const updateNode = useCollectionStore((state) => state.updateNode);
  const removeNode = useCollectionStore((state) => state.removeNode);
  const createRequest = useCollectionStore((state) => state.createRequest);
  const removeRequest = useCollectionStore((state) => state.removeRequest);
  const duplicateRequest = useCollectionStore((state) => state.duplicateRequest);
  const moveItem = useCollectionStore((state) => state.moveItem);
  const reorder = useCollectionStore((state) => state.reorder);
  const openRequest = useTabStore((state) => state.openRequest);
  const detachSource = useTabStore((state) => state.detachSource);
  const defaultBodyMode = useSettingsStore((state) => state.preference.defaultBodyMode);
  const toast = useUiStore((state) => state.toast);
  const { t } = useI18n();
  const [drag, setDrag] = useState<DragPayload | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget>(null);

  const expandedSet = useMemo(() => new Set(expanded), [expanded]);
  const filtered = useMemo(() => filterTree(tree, search), [tree, search]);

  const promptName = (title: string, label: string, initial: string, onSubmit: (value: string) => Promise<void>): void => {
    useUiStore.getState().openPrompt({ title, label, initialValue: initial, confirmLabel: 'Save', onSubmit });
  };

  const newCollection = (): void => {
    promptName(t('New collection'), t('Collection name'), t('New collection'), async (name) => {
      try {
        await createNode({ name, parentId: null, type: 'collection' });
      } catch {
        // Store already surfaced the error.
      }
    });
  };

  const newFolder = (parentId: string): void => {
    promptName(t('New folder'), t('Folder name'), t('New folder'), async (name) => {
      try {
        await createNode({ name, parentId, type: 'folder' });
        expand(parentId);
      } catch {
        // Store already surfaced the error.
      }
    });
  };

  const newRequest = async (parentId: string): Promise<void> => {
    try {
      const request = await createRequest({
        collectionId: parentId,
        name: t('New request'),
        request: { body: { ...createEmptyBody(), mode: defaultBodyMode } }
      });
      openRequest(request);
    } catch {
      // Store already surfaced the error.
    }
  };

  const renameNode = (node: CollectionNode): void => {
    promptName(t('Rename'), t('Name'), node.name, async (name) => {
      try {
        await updateNode(node.id, { name });
      } catch {
        // Store already surfaced the error.
      }
    });
  };

  const renameRequest = (request: SavedRequest): void => {
    promptName(t('Rename request'), t('Request name'), request.name, async (name) => {
      try {
        await useCollectionStore.getState().updateRequest(request.id, { name });
      } catch {
        // Store already surfaced the error.
      }
    });
  };

  const confirmDeleteNode = (node: CollectionNode): void => {
    useUiStore.getState().openConfirm({
      title: node.type === 'collection' ? t('Delete collection') : t('Delete folder'),
      message: t('Delete “{name}” and everything inside it? This cannot be undone.', { name: node.name }),
      confirmLabel: t('Delete'),
      danger: true,
      onConfirm: async () => {
        await removeNode(node.id);
      }
    });
  };

  const confirmDeleteRequest = (request: SavedRequest): void => {
    useUiStore.getState().openConfirm({
      title: t('Delete request'),
      message: t('Delete “{name}”? This cannot be undone.', { name: request.name }),
      confirmLabel: t('Delete'),
      danger: true,
      onConfirm: async () => {
        await removeRequest(request.id);
        detachSource(request.id);
      }
    });
  };

  const exportCollection = async (collectionId: string): Promise<void> => {
    try {
      const result = await unwrap(window.pigeon.transfer.exportPostman({ collectionId }));
      if (result) toast('success', t('Collection exported'), result.path);
    } catch (error) {
      toast('error', t('Export failed'), asApiCallError(error).message);
    }
  };

  const menuForNode = (node: CollectionNode): MenuAction[] => [
    { label: t('New request'), icon: <Plus size={15} />, onSelect: () => void newRequest(node.id) },
    ...(node.type === 'collection' || node.type === 'folder'
      ? [{ label: t('New folder'), icon: <FolderPlus size={15} />, onSelect: () => newFolder(node.id) }]
      : []),
    { separator: true },
    { label: t('Rename'), icon: <Pencil size={15} />, onSelect: () => renameNode(node) },
    { label: t('Export as Postman'), icon: <Download size={15} />, onSelect: () => void exportCollection(node.id) },
    { separator: true },
    { label: t('Delete'), icon: <Trash2 size={15} />, danger: true, onSelect: () => confirmDeleteNode(node) }
  ];

  const menuForRequest = (request: SavedRequest): MenuAction[] => [
    { label: t('Open'), icon: <Play size={15} />, onSelect: () => openRequest(request) },
    { label: t('Rename'), icon: <Pencil size={15} />, onSelect: () => renameRequest(request) },
    { label: t('Duplicate'), icon: <Copy size={15} />, onSelect: () => void duplicateRequest(request.id).then((copy) => openRequest(copy)).catch(() => undefined) },
    { separator: true },
    { label: t('Delete'), icon: <Trash2 size={15} />, danger: true, onSelect: () => confirmDeleteRequest(request) }
  ];

  const openMenu = (event: React.MouseEvent, items: MenuAction[]): void => {
    event.preventDefault();
    event.stopPropagation();
    useUiStore.getState().openContextMenu(event.clientX, event.clientY, items);
  };

  const dropOnNode = async (node: CollectionNode): Promise<void> => {
    if (!drag || drag.id === node.id) return;
    if (drag.kind === 'node') {
      const dragged = nodes.find((entry) => entry.id === drag.id);
      if (!dragged || dragged.type === 'collection') return;
    }
    await moveItem(drag.id, drag.kind, node.id);
    expand(node.id);
    setDrag(null);
    setDropTarget(null);
  };

  const dropOnRequest = async (request: SavedRequest, event: React.DragEvent): Promise<void> => {
    if (!drag) return;
    const parentId = request.collectionId;
    const siblings = siblingsFor(parentId, nodes, requests);
    const dragged = siblings.find((entry) => entry.id === drag.id);
    if (!dragged) {
      await moveItem(drag.id, drag.kind, parentId);
      setDrag(null);
      setDropTarget(null);
      return;
    }
    const rect = (event.currentTarget as HTMLElement).getBoundingClientRect();
    const after = event.clientY > rect.top + rect.height / 2;
    const ids = siblings.map((entry) => entry.id).filter((id) => id !== drag.id);
    const targetIndex = ids.indexOf(request.id);
    const insertAt = targetIndex < 0 ? ids.length : targetIndex + (after ? 1 : 0);
    ids.splice(insertAt, 0, drag.id);
    await reorder(parentId, ids);
    setDrag(null);
    setDropTarget(null);
  };

  const renderItem = (item: TreeItem, depth: number): React.JSX.Element => {
    if (item.kind === 'request') {
      const isActive = selectedId === item.id;
      const dropClass = dropTarget?.id === item.id ? `drop-${dropTarget.position}` : '';
      return (
        <div
          key={`request-${item.id}`}
          className={`tree-row request-row ${isActive ? 'selected' : ''} ${dropClass}`}
          style={{ paddingLeft: 10 + depth * 14 }}
          draggable
          onDragStart={(event) => {
            setDrag({ id: item.id, kind: 'request' });
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', item.id);
          }}
          onDragOver={(event) => {
            if (!drag) return;
            event.preventDefault();
            const rect = event.currentTarget.getBoundingClientRect();
            setDropTarget({ id: item.id, position: event.clientY > rect.top + rect.height / 2 ? 'after' : 'before' });
          }}
          onDragLeave={() => setDropTarget((current) => (current?.id === item.id ? null : current))}
          onDrop={(event) => {
            event.preventDefault();
            void dropOnRequest(item.request, event);
          }}
          onClick={() => {
            setSelected(item.id);
            openRequest(item.request);
          }}
          onContextMenu={(event) => openMenu(event, menuForRequest(item.request))}
          title={item.request.url}
        >
          <span className={`method-chip ${methodTone(item.request.method)}`}>{item.request.method}</span>
          <span className="tree-label">{item.request.name}</span>
          <Menu
            className="row-menu"
            trigger={<MoreHorizontal size={14} />}
            items={menuForRequest(item.request)}
            width={200}
          />
        </div>
      );
    }

    const isOpen = search.length > 0 || expandedSet.has(item.node.id);
    const isSelected = selectedId === item.node.id;
    const dropClass = dropTarget?.id === item.node.id ? 'drop-inside' : '';
    return (
      <div key={`node-${item.node.id}`}>
        <div
          className={`tree-row node-row ${isSelected ? 'selected' : ''} ${dropClass}`}
          style={{ paddingLeft: 6 + depth * 14 }}
          draggable={item.node.type === 'folder'}
          onDragStart={(event) => {
            if (item.node.type !== 'folder') return;
            setDrag({ id: item.node.id, kind: 'node' });
            event.dataTransfer.effectAllowed = 'move';
            event.dataTransfer.setData('text/plain', item.node.id);
          }}
          onDragOver={(event) => {
            if (!drag || drag.id === item.node.id) return;
            event.preventDefault();
            setDropTarget({ id: item.node.id, position: 'inside' });
          }}
          onDragLeave={() => setDropTarget((current) => (current?.id === item.node.id ? null : current))}
          onDrop={(event) => {
            event.preventDefault();
            void dropOnNode(item.node);
          }}
          onClick={() => {
            setSelected(item.node.id);
            toggleExpanded(item.node.id);
          }}
          onContextMenu={(event) => openMenu(event, menuForNode(item.node))}
        >
          <button
            type="button"
            className="tree-chevron"
            onClick={(event) => {
              event.stopPropagation();
              toggleExpanded(item.node.id);
            }}
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            {isOpen ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
          </button>
          {isOpen ? <FolderClosed size={15} className="tree-folder" /> : <Folder size={15} className="tree-folder" />}
          <span className="tree-label">{item.node.name}</span>
          <span className="tree-count">{item.children.length}</span>
          <Menu
            className="row-menu"
            trigger={<MoreHorizontal size={14} />}
            items={menuForNode(item.node)}
            width={210}
          />
        </div>
        {isOpen && item.children.map((child) => renderItem(child, depth + 1))}
      </div>
    );
  };

  return (
    <section className="side-panel-inner collections-panel">
      <header className="panel-head">
        <span>{t('Collections')}</span>
        <div className="panel-head-actions">
          <button type="button" className="mini-btn" onClick={newCollection} title={t('New collection')} aria-label={t('New collection')}>
            <FolderPlus size={15} />
          </button>
        </div>
      </header>
      <div className="panel-search">
        <Search size={14} />
        <input value={search} onChange={(event) => setSearch(event.target.value)} placeholder={t('Filter collections')} />
        {search && <button type="button" onClick={() => setSearch('')}>{t('Clear')}</button>}
      </div>
      <div className="panel-scroll">
        {loading && tree.length === 0 ? (
          <div className="panel-loading"><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<FolderTreeIcon />}
            title={search ? t('No matches') : t('No collections yet')}
            description={search ? t('Try a different filter.') : t('Create a collection to organize your API requests.')}
            action={
              !search ? (
                <button type="button" className="btn btn-secondary btn-sm" onClick={newCollection}>
                  <Plus size={14} /> {t('New collection')}
                </button>
              ) : undefined
            }
          />
        ) : (
          filtered.map((item) => renderItem(item, 0))
        )}
      </div>
      <footer className="panel-foot">
        <button type="button" onClick={newCollection}><Plus size={14} /> {t('New collection')}</button>
      </footer>
    </section>
  );
}

function FolderTreeIcon(): React.JSX.Element {
  return <FolderTree size={26} />;
}
