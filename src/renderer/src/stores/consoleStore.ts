import { create } from 'zustand';
import type { HttpMethod } from '@shared/types';

export type ConsoleLevel = 'info' | 'success' | 'warn' | 'error' | 'debug';

export interface ConsoleEntry {
  id: string;
  timestamp: number;
  level: ConsoleLevel;
  method?: HttpMethod | string;
  url?: string;
  status?: number;
  durationMs?: number;
  sizeBytes?: number;
  message: string;
  detail?: string;
}

interface ConsoleInput {
  level: ConsoleLevel;
  message: string;
  method?: string;
  url?: string;
  status?: number;
  durationMs?: number;
  sizeBytes?: number;
  detail?: string;
}

interface ConsoleState {
  entries: ConsoleEntry[];
  visible: boolean;
  filter: 'all' | 'errors';
  log: (input: ConsoleInput) => void;
  clear: () => void;
  setVisible: (visible: boolean) => void;
  toggle: () => void;
  setFilter: (filter: 'all' | 'errors') => void;
}

let counter = 0;

export const useConsoleStore = create<ConsoleState>((set) => ({
  entries: [],
  visible: false,
  filter: 'all',
  log: (input) =>
    set((state) => ({
      entries: [
        ...state.entries,
        { ...input, id: `console-${++counter}`, timestamp: Date.now() }
      ].slice(-600)
    })),
  clear: () => set({ entries: [] }),
  setVisible: (visible) => set({ visible }),
  toggle: () => set((state) => ({ visible: !state.visible })),
  setFilter: (filter) => set({ filter })
}));
