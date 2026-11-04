import { create } from 'zustand';
import type { Environment, EnvironmentVariable } from '@shared/types';
import { asApiCallError, unwrap } from '../utils/api';
import { useUiStore } from './uiStore';
import { t } from '../i18n';

interface EnvironmentState {
  environments: Environment[];
  globals: EnvironmentVariable[];
  loading: boolean;
  load: () => Promise<void>;
  create: (name: string) => Promise<Environment>;
  update: (id: string, patch: { name?: string; variables?: EnvironmentVariable[] }) => Promise<Environment>;
  remove: (id: string) => Promise<void>;
  activate: (id: string) => Promise<void>;
  reveal: (environmentId: string | null, key: string) => Promise<string>;
  saveGlobals: (variables: EnvironmentVariable[]) => Promise<void>;
  active: () => Environment | undefined;
}

function notifyError(title: string, error: unknown): void {
  useUiStore.getState().toast('error', title, asApiCallError(error).message);
}

export const useEnvStore = create<EnvironmentState>((set, get) => ({
  environments: [],
  globals: [],
  loading: false,
  load: async () => {
    set({ loading: true });
    try {
      const [environments, globals] = await Promise.all([
        unwrap(window.pigeon.env.list()),
        unwrap(window.pigeon.env.globals())
      ]);
      set({ environments, globals, loading: false });
    } catch (error) {
      set({ loading: false });
      notifyError(t('Unable to load environments'), error);
    }
  },
  create: async (name) => {
    try {
      const environment = await unwrap(window.pigeon.env.create({ name }));
      await get().load();
      useUiStore.getState().toast('success', t('Environment created'), environment.name);
      return environment;
    } catch (error) {
      notifyError(t('Unable to create environment'), error);
      throw error;
    }
  },
  update: async (id, patch) => {
    try {
      const environment = await unwrap(window.pigeon.env.update({ id, ...patch }));
      await get().load();
      useUiStore.getState().toast('success', t('Environment saved'), environment.name);
      return environment;
    } catch (error) {
      notifyError(t('Unable to save environment'), error);
      throw error;
    }
  },
  remove: async (id) => {
    try {
      await unwrap(window.pigeon.env.remove(id));
      await get().load();
      useUiStore.getState().toast('success', t('Environment deleted'));
    } catch (error) {
      notifyError(t('Unable to delete environment'), error);
      throw error;
    }
  },
  activate: async (id) => {
    try {
      const environments = await unwrap(window.pigeon.env.activate(id));
      set({ environments });
      const active = environments.find((environment) => environment.id === id);
      useUiStore.getState().toast('info', t('Environment switched'), active?.name);
    } catch (error) {
      notifyError(t('Unable to switch environment'), error);
    }
  },
  reveal: async (environmentId, key) => {
    try {
      return await unwrap(window.pigeon.env.reveal({ environmentId, key }));
    } catch (error) {
      notifyError(t('Unable to reveal variable'), error);
      throw error;
    }
  },
  saveGlobals: async (variables) => {
    try {
      const globals = await unwrap(window.pigeon.env.saveGlobals(variables));
      set({ globals });
      useUiStore.getState().toast('success', t('Global variables saved'));
    } catch (error) {
      notifyError(t('Unable to save global variables'), error);
      throw error;
    }
  },
  active: () => get().environments.find((environment) => environment.isActive)
}));
