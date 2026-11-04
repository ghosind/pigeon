import { create } from 'zustand';
import type { HistoryRecord } from '@shared/types';
import { asApiCallError, unwrap } from '../utils/api';
import { useUiStore } from './uiStore';
import { t } from '../i18n';

interface HistoryState {
  items: HistoryRecord[];
  total: number;
  loading: boolean;
  search: string;
  setSearch: (search: string) => void;
  load: (reset?: boolean) => Promise<void>;
  loadMore: () => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
}

const PAGE_SIZE = 40;

function notifyError(title: string, error: unknown): void {
  useUiStore.getState().toast('error', title, asApiCallError(error).message);
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  items: [],
  total: 0,
  loading: false,
  search: '',
  setSearch: (search) => {
    set({ search });
    void get().load(true);
  },
  load: async (reset = true) => {
    set({ loading: true });
    try {
      const page = await unwrap(
        window.pigeon.history.list({
          search: get().search || undefined,
          limit: PAGE_SIZE,
          offset: reset ? 0 : get().items.length
        })
      );
      set((state) => ({
        items: reset ? page.items : [...state.items, ...page.items],
        total: page.total,
        loading: false
      }));
    } catch (error) {
      set({ loading: false });
      notifyError(t('Unable to load history'), error);
    }
  },
  loadMore: async () => {
    if (get().items.length >= get().total || get().loading) return;
    await get().load(false);
  },
  remove: async (id) => {
    try {
      await unwrap(window.pigeon.history.remove(id));
      set((state) => ({ items: state.items.filter((item) => item.id !== id), total: Math.max(0, state.total - 1) }));
    } catch (error) {
      notifyError(t('Unable to delete history entry'), error);
    }
  },
  clear: async () => {
    try {
      await unwrap(window.pigeon.history.clear());
      set({ items: [], total: 0 });
      useUiStore.getState().toast('success', t('History cleared'));
    } catch (error) {
      notifyError(t('Unable to clear history'), error);
    }
  }
}));
