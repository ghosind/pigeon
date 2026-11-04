import { create } from 'zustand';
import type { CollectionNode, RequestDefinition, SavedRequest } from '@shared/types';
import type { CollectionCreateInput, RequestCreateInput } from '@shared/ipc';
import { asApiCallError, unwrap } from '../utils/api';
import { useUiStore } from './uiStore';
import { t } from '../i18n';

interface CollectionState {
  nodes: CollectionNode[];
  requests: SavedRequest[];
  loading: boolean;
  loaded: boolean;
  selectedId: string | null;
  expanded: string[];
  search: string;
  load: () => Promise<void>;
  setSelected: (id: string | null) => void;
  setSearch: (value: string) => void;
  toggleExpanded: (id: string) => void;
  expand: (id: string) => void;
  createNode: (input: CollectionCreateInput) => Promise<CollectionNode>;
  updateNode: (id: string, patch: Partial<Pick<CollectionNode, 'name' | 'description' | 'preRequestScript' | 'testScript'>>) => Promise<CollectionNode>;
  removeNode: (id: string) => Promise<void>;
  createRequest: (input: RequestCreateInput) => Promise<SavedRequest>;
  updateRequest: (id: string, patch: Partial<RequestDefinition>, options?: { silent?: boolean }) => Promise<SavedRequest>;
  patchRequestLocal: (id: string, patch: Partial<RequestDefinition>) => void;
  removeRequest: (id: string) => Promise<void>;
  duplicateRequest: (id: string) => Promise<SavedRequest>;
  reorder: (parentId: string, orderedIds: string[]) => Promise<void>;
  moveItem: (id: string, kind: 'node' | 'request', parentId: string | null) => Promise<void>;
  refresh: () => Promise<void>;
  resetForWorkspace: () => void;
}

function notifyError(title: string, error: unknown): void {
  useUiStore.getState().toast('error', title, asApiCallError(error).message);
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  nodes: [],
  requests: [],
  loading: false,
  loaded: false,
  selectedId: null,
  expanded: [],
  search: '',
  load: async () => {
    set({ loading: true });
    try {
      const snapshot = await unwrap(window.pigeon.collections.snapshot());
      const shouldExpandAll = !get().loaded;
      set((state) => ({
        nodes: snapshot.nodes,
        requests: snapshot.requests,
        loading: false,
        loaded: true,
        expanded: shouldExpandAll
          ? snapshot.nodes.filter((node) => node.type === 'collection').map((node) => node.id)
          : state.expanded
      }));
    } catch (error) {
      set({ loading: false, loaded: true });
      notifyError(t('Unable to load collections'), error);
    }
  },
  setSelected: (selectedId) => set({ selectedId }),
  setSearch: (search) => set({ search }),
  toggleExpanded: (id) =>
    set((state) => ({
      expanded: state.expanded.includes(id)
        ? state.expanded.filter((entry) => entry !== id)
        : [...state.expanded, id]
    })),
  expand: (id) =>
    set((state) => (state.expanded.includes(id) ? state : { expanded: [...state.expanded, id] })),
  createNode: async (input) => {
    try {
      const node = await unwrap(window.pigeon.collections.create(input));
      await get().load();
      if (input.parentId) get().expand(input.parentId);
      get().setSelected(node.id);
      return node;
    } catch (error) {
      notifyError(t('Unable to create item'), error);
      throw error;
    }
  },
  updateNode: async (id, patch) => {
    try {
      const node = await unwrap(window.pigeon.collections.update({ id, patch }));
      set((state) => ({ nodes: state.nodes.map((entry) => (entry.id === id ? node : entry)) }));
      return node;
    } catch (error) {
      notifyError(t('Unable to update item'), error);
      throw error;
    }
  },
  removeNode: async (id) => {
    try {
      await unwrap(window.pigeon.collections.remove(id));
      set((state) => ({
        nodes: state.nodes.filter((node) => node.id !== id),
        requests: state.requests.filter((request) => request.collectionId !== id),
        selectedId: state.selectedId === id ? null : state.selectedId
      }));
      await get().load();
    } catch (error) {
      notifyError(t('Unable to delete item'), error);
      throw error;
    }
  },
  createRequest: async (input) => {
    try {
      const request = await unwrap(window.pigeon.requests.create(input));
      set((state) => ({ requests: [...state.requests, request] }));
      get().expand(input.collectionId);
      get().setSelected(request.id);
      return request;
    } catch (error) {
      notifyError(t('Unable to create request'), error);
      throw error;
    }
  },
  updateRequest: async (id, patch, options) => {
    try {
      const request = await unwrap(window.pigeon.requests.update({ id, patch }));
      get().patchRequestLocal(id, request);
      return request;
    } catch (error) {
      if (!options?.silent) notifyError(t('Unable to save request'), error);
      throw error;
    }
  },
  patchRequestLocal: (id, patch) =>
    set((state) => ({
      requests: state.requests.map((request) => (request.id === id ? { ...request, ...patch, updatedAt: Date.now() } : request))
    })),
  removeRequest: async (id) => {
    try {
      await unwrap(window.pigeon.requests.remove(id));
      set((state) => ({
        requests: state.requests.filter((request) => request.id !== id),
        selectedId: state.selectedId === id ? null : state.selectedId
      }));
    } catch (error) {
      notifyError(t('Unable to delete request'), error);
      throw error;
    }
  },
  duplicateRequest: async (id) => {
    try {
      const request = await unwrap(window.pigeon.requests.duplicate(id));
      set((state) => ({ requests: [...state.requests, request] }));
      get().setSelected(request.id);
      useUiStore.getState().toast('success', t('Request duplicated'));
      return request;
    } catch (error) {
      notifyError(t('Unable to duplicate request'), error);
      throw error;
    }
  },
  reorder: async (parentId, orderedIds) => {
    try {
      await unwrap(window.pigeon.collections.reorder(parentId, orderedIds));
      await get().load();
    } catch (error) {
      notifyError(t('Unable to reorder items'), error);
    }
  },
  moveItem: async (id, kind, parentId) => {
    try {
      await unwrap(window.pigeon.collections.move(id, kind, parentId));
      if (parentId) get().expand(parentId);
      await get().load();
    } catch (error) {
      notifyError(t('Unable to move item'), error);
    }
  },
  refresh: async () => {
    await get().load();
  },
  resetForWorkspace: () =>
    set({ nodes: [], requests: [], selectedId: null, expanded: [], loaded: false, loading: true })
}));

export function requestToDefinition(request: SavedRequest): RequestDefinition {
  return {
    name: request.name,
    method: request.method,
    url: request.url,
    queryParams: structuredClone(request.queryParams),
    headers: structuredClone(request.headers),
    body: structuredClone(request.body),
    preRequestScript: request.preRequestScript,
    testScript: request.testScript,
    auth: structuredClone(request.auth)
  };
}
