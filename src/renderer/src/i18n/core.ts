import type { LanguagePreference } from '@shared/types';
import enDictionary from './locales/en.json';
import zhCNDictionary from './locales/zh-CN.json';

/**
 * Translation catalogs live next to this file as JSON so that translators can
 * edit them without touching application code. Keys are the English source
 * strings; both catalogs must contain the same key set.
 */
export type ResolvedLanguage = 'en' | 'zh-CN';

const dictionaries: Record<ResolvedLanguage, Record<string, string>> = {
  en: enDictionary,
  'zh-CN': zhCNDictionary
};

export function detectSystemLanguage(): ResolvedLanguage {
  return (navigator.language || 'en').toLowerCase().startsWith('zh') ? 'zh-CN' : 'en';
}

export function resolveLanguage(preference?: LanguagePreference | null): ResolvedLanguage {
  if (preference === 'zh-CN' || preference === 'en') return preference;
  return detectSystemLanguage();
}

export function translateFor(
  language: ResolvedLanguage,
  source: string,
  variables?: Record<string, string | number>
): string {
  const template = dictionaries[language][source] ?? dictionaries.en[source] ?? source;
  if (!variables) return template;
  return template.replace(/\{(\w+)\}/g, (match, key: string) =>
    variables[key] === undefined ? match : String(variables[key])
  );
}
