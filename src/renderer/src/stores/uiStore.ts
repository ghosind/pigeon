import { create } from 'zustand';
import type { ContextMenuItem, ConfirmDialogState, PromptDialogState, SidePanel, ToastMessage, ToastKind } from '../types/ui';

interface UiState {
  sidePanel: SidePanel;
  panelOpen: boolean;
  panelWidth: number;
  responseWidth: number;
  toasts: ToastMessage[];
  contextMenu: { x: number; y: number; items: ContextMenuItem[] } | null;
  prompt: PromptDialogState | null;
  confirm: ConfirmDialogState | null;
  commandOpen: boolean;
  saveRequestTabId: string | null;
  codeSidebarOpen: boolean;
  codeSidebarWidth: number;
  setSidePanel: (panel: SidePanel) => void;
  togglePanel: (panel: SidePanel) => void;
  setPanelOpen: (open: boolean) => void;
  setPanelWidth: (width: number) => void;
  setResponseWidth: (width: number) => void;
  toast: (kind: ToastKind, title: string, description?: string) => void;
  dismissToast: (id: string) => void;
  openContextMenu: (x: number, y: number, items: ContextMenuItem[]) => void;
  closeContextMenu: () => void;
  openPrompt: (state: PromptDialogState) => void;
  closePrompt: () => void;
  openConfirm: (state: ConfirmDialogState) => void;
  closeConfirm: () => void;
  setCommandOpen: (open: boolean) => void;
  openSaveRequest: (tabId: string) => void;
  closeSaveRequest: () => void;
  setCodeSidebarOpen: (open: boolean) => void;
  toggleCodeSidebar: () => void;
  setCodeSidebarWidth: (width: number) => void;
}

let toastCounter = 0;

export const useUiStore = create<UiState>((set, get) => ({
  sidePanel: 'collections',
  panelOpen: true,
  panelWidth: 296,
  responseWidth: 46,
  toasts: [],
  contextMenu: null,
  prompt: null,
  confirm: null,
  commandOpen: false,
  saveRequestTabId: null,
  codeSidebarOpen: false,
  codeSidebarWidth: 340,
  setSidePanel: (sidePanel) => set({ sidePanel, panelOpen: true }),
  togglePanel: (panel) => {
    const state = get();
    if (state.sidePanel === panel && state.panelOpen) set({ panelOpen: false });
    else set({ sidePanel: panel, panelOpen: true });
  },
  setPanelOpen: (panelOpen) => set({ panelOpen }),
  setPanelWidth: (width) => set({ panelWidth: Math.min(440, Math.max(232, width)) }),
  setResponseWidth: (width) => set({ responseWidth: Math.min(72, Math.max(28, width)) }),
  toast: (kind, title, description) => {
    const id = `toast-${++toastCounter}`;
    set((state) => ({ toasts: [...state.toasts, { id, kind, title, description }].slice(-5) }));
    window.setTimeout(() => get().dismissToast(id), kind === 'error' ? 7000 : 4200);
  },
  dismissToast: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
  openContextMenu: (x, y, items) => set({ contextMenu: { x, y, items } }),
  closeContextMenu: () => set({ contextMenu: null }),
  openPrompt: (prompt) => set({ prompt }),
  closePrompt: () => set({ prompt: null }),
  openConfirm: (confirm) => set({ confirm }),
  closeConfirm: () => set({ confirm: null }),
  setCommandOpen: (commandOpen) => set({ commandOpen }),
  openSaveRequest: (saveRequestTabId) => set({ saveRequestTabId }),
  closeSaveRequest: () => set({ saveRequestTabId: null }),
  setCodeSidebarOpen: (codeSidebarOpen) => set({ codeSidebarOpen }),
  toggleCodeSidebar: () => set((state) => ({ codeSidebarOpen: !state.codeSidebarOpen })),
  setCodeSidebarWidth: (width) => set({ codeSidebarWidth: Math.min(620, Math.max(300, width)) })
}));
