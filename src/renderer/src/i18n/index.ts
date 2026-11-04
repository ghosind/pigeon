import { useCallback } from 'react';
import { useSettingsStore } from '../stores/settingsStore';
import { resolveLanguage, translateFor, type ResolvedLanguage } from './core';

export type { ResolvedLanguage } from './core';

export function useI18n(): {
  language: ResolvedLanguage;
  t: (source: string, variables?: Record<string, string | number>) => string;
} {
  const preference = useSettingsStore((state) => state.preference.language);
  const language = resolveLanguage(preference);
  const t = useCallback(
    (source: string, variables?: Record<string, string | number>) => translateFor(language, source, variables),
    [language]
  );
  return { language, t };
}

/** Non-React translation for Zustand stores and one-off helpers. */
export function t(source: string, variables?: Record<string, string | number>): string {
  return translateFor(resolveLanguage(useSettingsStore.getState().preference.language), source, variables);
}
