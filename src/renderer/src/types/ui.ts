import type { ToastKind } from '@shared/types';

export type { ToastMessage, ToastKind } from '@shared/types';

export type SidePanel = 'collections' | 'history' | 'environments';

export interface ContextMenuItem {
  label?: string;
  shortcut?: string;
  danger?: boolean;
  disabled?: boolean;
  separator?: boolean;
  onSelect?: () => void;
}

export interface PromptDialogState {
  title: string;
  label: string;
  initialValue?: string;
  placeholder?: string;
  confirmLabel?: string;
  onSubmit: (value: string) => void | Promise<void>;
}

export interface ConfirmDialogState {
  title: string;
  message: string;
  confirmLabel?: string;
  danger?: boolean;
  onConfirm: () => void | Promise<void>;
}

export type ToastKindAlias = ToastKind;
