import { create } from 'zustand';
import type { Workspace } from '@shared/types';
import { asApiCallError, unwrap } from '../utils/api';
import { useCollectionStore } from './collectionStore';
import { useEnvStore } from './envStore';
import { useHistoryStore } from './historyStore';
import { useTabStore } from './tabStore';
import { useUiStore } from './uiStore';
import { t } from '../i18n';

interface WorkspaceState {
  workspaces: Workspace[];
  loading: boolean;
  loaded: boolean;
  load: () => Promise<void>;
  create: (name: string) => Promise<void>;
  rename: (id: string, name: string) => Promise<void>;
  activate: (id: string, options?: { silent?: boolean }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  active: () => Workspace | undefined;
}

function notifyError(title: string, error: unknown): void {
  useUiStore.getState().toast('error', title, asApiCallError(error).message);
}

async function refreshWorkspaceData(): Promise<void> {
  useTabStore.getState().resetTabs();
  useCollectionStore.getState().resetForWorkspace();
  useUiStore.getState().setCodeSidebarOpen(false);
  await Promise.all([
    useCollectionStore.getState().load(),
    useEnvStore.getState().load(),
    useHistoryStore.getState().load(true)
  ]);
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  loading: false,
  loaded: false,
  load: async () => {
    set({ loading: true });
    try {
      const workspaces = await unwrap(window.pigeon.workspaces.list());
      set({ workspaces, loading: false, loaded: true });
    } catch (error) {
      set({ loading: false, loaded: true });
      notifyError(t('Unable to load workspaces'), error);
    }
  },
  create: async (name) => {
    try {
      const workspaces = await unwrap(window.pigeon.workspaces.create(name));
      set({ workspaces });
      await refreshWorkspaceData();
      useUiStore.getState().toast('success', t('Workspace created'), name);
    } catch (error) {
      notifyError(t('Unable to create workspace'), error);
      throw error;
    }
  },
  rename: async (id, name) => {
    try {
      const workspaces = await unwrap(window.pigeon.workspaces.rename(id, name));
      set({ workspaces });
      useUiStore.getState().toast('success', t('Workspace renamed'), name);
    } catch (error) {
      notifyError(t('Unable to rename workspace'), error);
      throw error;
    }
  },
  activate: async (id, options) => {
    if (get().active()?.id === id) return;
    try {
      const workspaces = await unwrap(window.pigeon.workspaces.activate(id));
      set({ workspaces });
      await refreshWorkspaceData();
      if (!options?.silent) {
        const active = workspaces.find((workspace) => workspace.isActive);
        useUiStore.getState().toast('info', t('Workspace switched'), active?.name);
      }
    } catch (error) {
      notifyError(t('Unable to switch workspace'), error);
    }
  },
  remove: async (id) => {
    try {
      const workspaces = await unwrap(window.pigeon.workspaces.remove(id));
      set({ workspaces });
      await refreshWorkspaceData();
      useUiStore.getState().toast('success', t('Workspace deleted'));
    } catch (error) {
      notifyError(t('Unable to delete workspace'), error);
      throw error;
    }
  },
  active: () => get().workspaces.find((workspace) => workspace.isActive)
}));
