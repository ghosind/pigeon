import type { VariableEntry } from '@shared/types';

/** Parses the JSON column used for workspace/collection variables. */
export function parseScopedVariables(raw: string | null | undefined): VariableEntry[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry) => ({
        key: typeof entry.key === 'string' ? entry.key : '',
        value: typeof entry.value === 'string' ? entry.value : '',
        enabled: entry.enabled !== false
      }))
      .filter((entry) => entry.key.length > 0);
  } catch {
    return [];
  }
}

export function scopedVariablesToRecord(entries: VariableEntry[]): Record<string, string> {
  const record: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.enabled && entry.key) record[entry.key] = entry.value;
  }
  return record;
}
