import { create } from 'zustand';
import type { ApiError, CollectionNode, HistoryRecord, RequestDefinition, ResponseResult, SavedRequest } from '@shared/types';
import { createEmptyRequest } from '@shared/defaults';
import { asApiCallError } from '../utils/api';
import { useCollectionStore, requestToDefinition } from './collectionStore';
import { useEnvStore } from './envStore';
import { useHistoryStore } from './historyStore';
import { useSettingsStore } from './settingsStore';
import { useUiStore } from './uiStore';
import { useConsoleStore } from './consoleStore';
import { t } from '../i18n';

export type RequestTabKey = 'params' | 'body' | 'headers' | 'auth' | 'scripts';
export type ResponseTabKey = 'body' | 'headers' | 'console' | 'tests';
export type ResponseBodyView = 'pretty' | 'raw' | 'preview';

export interface WorkspaceTab {
  id: string;
  kind: 'request' | 'folder' | 'environment';
  folderId?: string;
  environmentId?: string | null;
  sourceRequestId?: string;
  collectionId?: string;
  fromHistory: boolean;
  draft: RequestDefinition;
  dirty: boolean;
  sending: boolean;
  activeRequestId?: string;
  cancelRequested: boolean;
  response?: ResponseResult;
  error?: ApiError;
  requestStartedAt?: number;
  savedAt?: number;
  requestTab: RequestTabKey;
  responseTab: ResponseTabKey;
  responseBodyView: ResponseBodyView;
}

interface TabState {
  tabs: WorkspaceTab[];
  activeTabId: string | null;
  createTab: (partial?: Partial<RequestDefinition>) => WorkspaceTab;
  openFolderTab: (folder: CollectionNode) => WorkspaceTab;
  openEnvironmentTab: (environmentId: string | null) => WorkspaceTab;
  openRequest: (request: SavedRequest) => WorkspaceTab | undefined;
  openHistory: (record: HistoryRecord) => WorkspaceTab;
  activate: (id: string) => void;
  reorderTabs: (sourceId: string, targetId: string, before: boolean) => void;
  closeTab: (id: string) => void;
  requestCloseTab: (id: string) => void;
  closeOthers: (id: string) => void;
  closeAll: () => void;
  resetTabs: () => void;
  duplicateTab: (id: string) => void;
  updateDraft: (id: string, patch: Partial<RequestDefinition>) => void;
  setRequestTab: (id: string, tab: RequestTabKey) => void;
  setResponseTab: (id: string, tab: ResponseTabKey) => void;
  setResponseBodyView: (id: string, view: ResponseBodyView) => void;
  saveNow: (id: string, silent?: boolean) => Promise<boolean>;
  saveToCollection: (id: string, collectionId: string, name: string) => Promise<boolean>;
  send: (id: string) => Promise<void>;
  cancel: (id: string) => Promise<void>;
  detachSource: (requestId: string) => void;
}

const saveTimers = new Map<string, number>();
const inFlight = new Set<string>();
const DEFAULT_NAME = 'Untitled request';

function newId(): string {
  return crypto.randomUUID();
}

function baseDraft(name = DEFAULT_NAME): RequestDefinition {
  return createEmptyRequest(name);
}

function mergeDraft(partial?: Partial<RequestDefinition>): RequestDefinition {
  const base = baseDraft(partial?.name?.trim() || DEFAULT_NAME);
  return {
    ...base,
    ...partial,
    name: partial?.name?.trim() || DEFAULT_NAME,
    queryParams: partial?.queryParams ? structuredClone(partial.queryParams) : base.queryParams,
    headers: partial?.headers ? structuredClone(partial.headers) : base.headers,
    body: { ...base.body, ...(partial?.body ?? {}) },
    auth: { ...base.auth, ...(partial?.auth ?? {}) }
  };
}

function makeTab(partial?: Partial<RequestDefinition>, extra: Partial<WorkspaceTab> = {}): WorkspaceTab {
  return {
    id: newId(),
    kind: 'request',
    fromHistory: false,
    draft: mergeDraft(partial),
    dirty: false,
    sending: false,
    cancelRequested: false,
    requestTab: 'params',
    responseTab: 'body',
    responseBodyView: 'pretty',
    ...extra
  };
}

function notifyError(title: string, error: unknown): void {
  useUiStore.getState().toast('error', title, asApiCallError(error).message);
}

export const useTabStore = create<TabState>((set, get) => ({
  tabs: [],
  activeTabId: null,
  createTab: (partial) => {
    const tab = makeTab(partial);
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
    return tab;
  },
  openFolderTab: (folder) => {
    const existing = get().tabs.find((tab) => tab.kind === 'folder' && tab.folderId === folder.id);
    if (existing) {
      set({ activeTabId: existing.id });
      return existing;
    }
    const tab = makeTab(undefined, { kind: 'folder', folderId: folder.id, draft: mergeDraft({ name: folder.name }) });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
    return tab;
  },
  openEnvironmentTab: (environmentId) => {
    const existing = get().tabs.find((tab) => tab.kind === 'environment' && tab.environmentId === environmentId);
    if (existing) {
      set({ activeTabId: existing.id });
      return existing;
    }
    const tab = makeTab(undefined, {
      kind: 'environment',
      environmentId,
      draft: mergeDraft({ name: environmentId ? 'Environment' : 'Global variables' })
    });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
    return tab;
  },
  openRequest: (request) => {
    const existing = get().tabs.find((tab) => tab.sourceRequestId === request.id);
    if (existing) {
      set({ activeTabId: existing.id });
      return existing;
    }
    const tab = makeTab(requestToDefinition(request), {
      sourceRequestId: request.id,
      collectionId: request.collectionId,
      savedAt: request.updatedAt
    });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
    return tab;
  },
  openHistory: (record) => {
    const tab = makeTab(record.snapshot, { fromHistory: true });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
    return tab;
  },
  activate: (id) => set({ activeTabId: id }),
  reorderTabs: (sourceId, targetId, before) => {
    set((state) => {
      const from = state.tabs.findIndex((tab) => tab.id === sourceId);
      const to = state.tabs.findIndex((tab) => tab.id === targetId);
      if (from < 0 || to < 0 || from === to) return state;
      const tabs = [...state.tabs];
      const [moved] = tabs.splice(from, 1);
      if (!moved) return state;
      const targetIndex = tabs.findIndex((tab) => tab.id === targetId);
      tabs.splice(before ? targetIndex : targetIndex + 1, 0, moved);
      return { tabs };
    });
  },
  requestCloseTab: (id) => {
    const tab = get().tabs.find((entry) => entry.id === id);
    if (!tab) return;
    if (tab.dirty && !tab.sourceRequestId) {
      useUiStore.getState().openConfirm({
        title: 'Discard unsaved request?',
        message: `“${tab.draft.name}” has not been saved to a collection. Closing this tab will discard it.`,
        confirmLabel: 'Discard and close',
        danger: true,
        onConfirm: () => get().closeTab(id)
      });
      return;
    }
    get().closeTab(id);
  },
  closeTab: (id) => {
    const tab = get().tabs.find((entry) => entry.id === id);
    if (tab?.dirty && tab.sourceRequestId) void get().saveNow(id, true);
    const timer = saveTimers.get(id);
    if (timer) window.clearTimeout(timer);
    saveTimers.delete(id);
    if (tab?.activeRequestId) void window.pigeon.request.cancel(tab.activeRequestId);
    set((state) => {
      const index = state.tabs.findIndex((entry) => entry.id === id);
      const tabs = state.tabs.filter((entry) => entry.id !== id);
      let activeTabId = state.activeTabId;
      if (state.activeTabId === id) {
        activeTabId = tabs[Math.min(index, tabs.length - 1)]?.id ?? null;
      }
      return { tabs, activeTabId };
    });
  },
  closeOthers: (id) => {
    for (const tab of get().tabs) {
      if (tab.id !== id) {
        if (tab.dirty && tab.sourceRequestId) void get().saveNow(tab.id, true);
        const timer = saveTimers.get(tab.id);
        if (timer) window.clearTimeout(timer);
        saveTimers.delete(tab.id);
      }
    }
    set((state) => ({ tabs: state.tabs.filter((tab) => tab.id === id), activeTabId: id }));
  },
  closeAll: () => {
    for (const tab of get().tabs) {
      if (tab.dirty && tab.sourceRequestId) void get().saveNow(tab.id, true);
    }
    for (const timer of saveTimers.values()) window.clearTimeout(timer);
    saveTimers.clear();
    set({ tabs: [], activeTabId: null });
  },
  resetTabs: () => {
    for (const tab of get().tabs) {
      if (tab.activeRequestId) void window.pigeon.request.cancel(tab.activeRequestId);
    }
    for (const timer of saveTimers.values()) window.clearTimeout(timer);
    saveTimers.clear();
    inFlight.clear();
    set({ tabs: [], activeTabId: null });
  },
  duplicateTab: (id) => {
    const source = get().tabs.find((tab) => tab.id === id);
    if (!source) return;
    const tab = makeTab({ ...structuredClone(source.draft), name: `${source.draft.name} copy` }, {
      collectionId: source.collectionId,
      dirty: true
    });
    set((state) => ({ tabs: [...state.tabs, tab], activeTabId: tab.id }));
  },
  updateDraft: (id, patch) => {
    const state = get();
    const tab = state.tabs.find((entry) => entry.id === id);
    if (!tab) return;
    const draft = { ...tab.draft, ...patch };
    set((current) => ({
      tabs: current.tabs.map((entry) =>
        entry.id === id ? { ...entry, draft, dirty: true, error: entry.error } : entry
      )
    }));
    if (tab.sourceRequestId) {
      useCollectionStore.getState().patchRequestLocal(tab.sourceRequestId, patch);
      const existing = saveTimers.get(id);
      if (existing) window.clearTimeout(existing);
      saveTimers.set(
        id,
        window.setTimeout(() => {
          saveTimers.delete(id);
          void get().saveNow(id, true);
        }, 700)
      );
    }
  },
  setRequestTab: (id, requestTab) =>
    set((state) => ({ tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, requestTab } : tab)) })),
  setResponseTab: (id, responseTab) =>
    set((state) => ({ tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, responseTab } : tab)) })),
  setResponseBodyView: (id, responseBodyView) =>
    set((state) => ({ tabs: state.tabs.map((tab) => (tab.id === id ? { ...tab, responseBodyView } : tab)) })),
  saveNow: async (id, silent = false) => {
    const tab = get().tabs.find((entry) => entry.id === id);
    if (!tab?.sourceRequestId) return false;
    const timer = saveTimers.get(id);
    if (timer) window.clearTimeout(timer);
    saveTimers.delete(id);
    try {
      const saved = await useCollectionStore.getState().updateRequest(tab.sourceRequestId, tab.draft, { silent: true });
      set((state) => ({
        tabs: state.tabs.map((entry) =>
          entry.id === id ? { ...entry, dirty: false, savedAt: saved.updatedAt, error: entry.error } : entry
        )
      }));
      if (!silent) useUiStore.getState().toast('success', t('Request saved'));
      return true;
    } catch (error) {
      if (!silent) notifyError(t('Unable to save request'), error);
      return false;
    }
  },
  saveToCollection: async (id, collectionId, name) => {
    const tab = get().tabs.find((entry) => entry.id === id);
    if (!tab) return false;
    try {
      const draft = { ...structuredClone(tab.draft), name };
      const request = await useCollectionStore.getState().createRequest({ collectionId, name, request: draft });
      set((state) => ({
        tabs: state.tabs.map((entry) =>
          entry.id === id
            ? {
                ...entry,
                sourceRequestId: request.id,
                collectionId,
                fromHistory: false,
                draft: { ...entry.draft, name },
                dirty: false,
                savedAt: request.updatedAt
              }
            : entry
        )
      }));
      useUiStore.getState().toast('success', t('Request saved to collection'));
      return true;
    } catch (error) {
      notifyError(t('Unable to save request'), error);
      return false;
    }
  },
  send: async (id) => {
    const tab = get().tabs.find((entry) => entry.id === id);
    if (!tab || tab.sending || inFlight.has(id)) return;
    inFlight.add(id);
    if (!tab.draft.url.trim()) {
      useUiStore.getState().toast('warning', t('Enter a URL before sending'));
      return;
    }
    if (tab.sourceRequestId && tab.dirty) await get().saveNow(id, true);
    const requestId = newId();
    useConsoleStore.getState().log({
      level: 'info',
      message: t('Request started'),
      method: tab.draft.method,
      url: tab.draft.url
    });
    set((state) => ({
      tabs: state.tabs.map((entry) =>
        entry.id === id
          ? {
              ...entry,
              sending: true,
              activeRequestId: requestId,
              cancelRequested: false,
              error: undefined,
              requestStartedAt: Date.now(),
              responseTab: 'body'
            }
          : entry
      )
    }));
    const activeEnv = useEnvStore.getState().active();
    try {
      const result = await window.pigeon.request.send({
        requestId,
        request: tab.draft,
        collectionId: tab.collectionId,
        environmentId: activeEnv?.id,
        recordHistory: true
      });
      if (!result.ok) {
        const cancelled = result.error.code === 'REQUEST_CANCELLED';
        set((state) => ({
          tabs: state.tabs.map((entry) =>
            entry.id === id ? { ...entry, sending: false, activeRequestId: undefined, error: result.error } : entry
          )
        }));
        useConsoleStore.getState().log({
          level: cancelled ? 'warn' : 'error',
          message: cancelled ? t('Request cancelled') : `${t('Request failed')}: ${result.error.code}`,
          method: tab.draft.method,
          url: tab.draft.url,
          detail: result.error.details ?? result.error.message
        });
        if (cancelled) useUiStore.getState().toast('info', t('Request cancelled'));
        else if (result.error.code !== 'REQUEST_TIMEOUT') {
          useUiStore.getState().toast('error', t('Request failed'), result.error.message);
        } else {
          useUiStore.getState().toast('warning', t('Request timed out'), result.error.message);
        }
      } else {
        set((state) => ({
          tabs: state.tabs.map((entry) =>
            entry.id === id
              ? {
                  ...entry,
                  sending: false,
                  activeRequestId: undefined,
                  response: result.data,
                  error: undefined,
                  responseTab: 'body',
                  responseBodyView: 'pretty'
                }
              : entry
          )
        }));
        useConsoleStore.getState().log({
          level: 'success',
          message: `${result.data.status} ${result.data.statusText}`,
          method: tab.draft.method,
          url: result.data.finalUrl,
          status: result.data.status,
          durationMs: result.data.durationMs,
          sizeBytes: result.data.sizeBytes
        });
        for (const log of result.data.consoleLogs) {
          useConsoleStore.getState().log({
            level: log.level === 'warn' ? 'warn' : log.level === 'error' ? 'error' : log.level === 'debug' ? 'debug' : 'info',
            message: log.scope === 'pre-request' ? `[pre-request] ${log.message}` : `[test] ${log.message}`,
            method: tab.draft.method,
            url: tab.draft.url,
            status: result.data.status
          });
        }
        void useHistoryStore.getState().load(true);
        if (Object.keys(result.data.environmentUpdates).length > 0 || Object.keys(result.data.globalUpdates).length > 0) {
          void useEnvStore.getState().load();
        }
      }
    } catch (error) {
      const apiError = asApiCallError(error);
      set((state) => ({
        tabs: state.tabs.map((entry) =>
          entry.id === id
            ? { ...entry, sending: false, activeRequestId: undefined, error: { code: apiError.code, message: apiError.message, details: apiError.details } }
            : entry
        )
      }));
      useConsoleStore.getState().log({
        level: 'error',
        message: t('Request failed'),
        method: tab.draft.method,
        url: tab.draft.url,
        detail: apiError.message
      });
      notifyError(t('Request failed'), error);
    } finally {
      inFlight.delete(id);
    }
  },
  cancel: async (id) => {
    const tab = get().tabs.find((entry) => entry.id === id);
    if (!tab?.activeRequestId) return;
    set((state) => ({
      tabs: state.tabs.map((entry) => (entry.id === id ? { ...entry, cancelRequested: true } : entry))
    }));
    await window.pigeon.request.cancel(tab.activeRequestId);
  },
  detachSource: (requestId) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.sourceRequestId === requestId
          ? { ...tab, sourceRequestId: undefined, collectionId: undefined, dirty: true }
          : tab
      )
    }));
  }
}));

export function useActiveTab(): WorkspaceTab | undefined {
  return useTabStore((state) => state.tabs.find((tab) => tab.id === state.activeTabId));
}

export function currentSettings() {
  return useSettingsStore.getState().preference;
}
