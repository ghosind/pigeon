import { create } from 'zustand';
import type { AppInfo, AppPreference, ThemePreference } from '@shared/types';
import { defaultPreference } from '@shared/defaults';
import { asApiCallError, unwrap } from '../utils/api';
import { useUiStore } from './uiStore';
import { t } from '../i18n';

interface SettingsState {
  preference: AppPreference;
  info: AppInfo | null;
  loaded: boolean;
  saving: boolean;
  load: () => Promise<void>;
  setPreference: (patch: Partial<AppPreference>) => void;
  setTheme: (theme: ThemePreference) => void;
  save: () => Promise<boolean>;
  applyTheme: () => void;
}

function prefersDark(): boolean {
  return window.matchMedia?.('(prefers-color-scheme: dark)').matches ?? false;
}

export function resolvedTheme(theme: ThemePreference): 'light' | 'dark' {
  return theme === 'system' ? (prefersDark() ? 'dark' : 'light') : theme;
}

export function applyTheme(theme: ThemePreference): void {
  document.documentElement.dataset.theme = resolvedTheme(theme);
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  preference: defaultPreference(''),
  info: null,
  loaded: false,
  saving: false,
  load: async () => {
    try {
      const [preference, info] = await Promise.all([unwrap(window.pigeon.settings.get()), unwrap(window.pigeon.app.info())]);
      set({ preference, info, loaded: true });
      applyTheme(preference.theme);
      document.documentElement.dataset.platform = info.platform;
    } catch (error) {
      useUiStore.getState().toast('error', t('Unable to load settings'), asApiCallError(error).message);
      set({ loaded: true });
    }
  },
  setPreference: (patch) => {
    set((state) => ({ preference: { ...state.preference, ...patch } }));
    if (patch.theme) applyTheme(patch.theme);
  },
  setTheme: (theme) => {
    set((state) => ({ preference: { ...state.preference, theme } }));
    applyTheme(theme);
  },
  save: async () => {
    set({ saving: true });
    try {
      const preference = await unwrap(window.pigeon.settings.save(get().preference));
      set({ preference, saving: false });
      applyTheme(preference.theme);
      useUiStore.getState().toast('success', t('Settings saved'));
      return true;
    } catch (error) {
      set({ saving: false });
      useUiStore.getState().toast('error', t('Unable to save settings'), asApiCallError(error).message);
      return false;
    }
  },
  applyTheme: () => applyTheme(get().preference.theme)
}));

export function installThemeWatcher(): () => void {
  const media = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = (): void => {
    const { preference } = useSettingsStore.getState();
    if (preference.theme === 'system') applyTheme('system');
  };
  media.addEventListener('change', listener);
  return () => media.removeEventListener('change', listener);
}
