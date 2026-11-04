/**
 * `{{variable}}` template resolver with Postman-like scope precedence:
 * local > environment > global. Unresolved placeholders are preserved.
 */

export const TEMPLATE_PATTERN = /\{\{\s*([^{}]+?)\s*\}\}/g;

export interface VariableScopes {
  local?: Record<string, string>;
  environment?: Record<string, string>;
  globals?: Record<string, string>;
}

export interface ResolveResult {
  value: string;
  unresolved: string[];
}

const DYNAMIC_VARIABLES = ['$timestamp', '$isoTimestamp', '$guid', '$randomUUID', '$randomInt'] as const;

function dynamicValue(name: string): string | undefined {
  switch (name) {
    case '$timestamp':
      return String(Math.floor(Date.now() / 1000));
    case '$isoTimestamp':
      return new Date().toISOString();
    case '$guid':
    case '$randomUUID':
      return globalThis.crypto.randomUUID();
    case '$randomInt':
      return String(Math.floor(Math.random() * 1000));
    default:
      return undefined;
  }
}

export function mergeScopes(scopes: VariableScopes): Record<string, string> {
  return { ...(scopes.globals ?? {}), ...(scopes.environment ?? {}), ...(scopes.local ?? {}) };
}

/**
 * Resolves nested placeholders up to `maxDepth` passes.
 * Values that cannot be resolved are returned in `unresolved`.
 */
export function resolveTemplate(
  template: string | undefined | null,
  scopes: VariableScopes,
  maxDepth = 8
): ResolveResult {
  if (!template) return { value: template ?? '', unresolved: [] };
  const map = mergeScopes(scopes);
  const unresolved = new Set<string>();
  let output = template;

  for (let pass = 0; pass < maxDepth; pass += 1) {
    let changed = false;
    output = output.replace(TEMPLATE_PATTERN, (match, rawName: string) => {
      const name = rawName.trim();
      const fromScope = map[name];
      if (fromScope !== undefined) {
        changed = true;
        return fromScope;
      }
      const dynamic = dynamicValue(name);
      if (dynamic !== undefined) {
        changed = true;
        return dynamic;
      }
      unresolved.add(name);
      return match;
    });
    if (!changed) break;
  }

  // A resolved value may itself contain a template for another variable.
  for (const name of Array.from(unresolved)) {
    if (map[name] !== undefined) unresolved.delete(name);
  }
  return { value: output, unresolved: Array.from(unresolved) };
}

export function resolveStringValue(value: string, scopes: VariableScopes): string {
  return resolveTemplate(value, scopes).value;
}

/** Replaces placeholders inside a flat record (used for headers and tokens). */
export function resolveRecord(
  record: Record<string, string>,
  scopes: VariableScopes
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(record).map(([key, value]) => [resolveStringValue(key, scopes), resolveStringValue(value, scopes)])
  );
}

export function listTemplateVariables(template: string): string[] {
  const seen = new Set<string>();
  for (const match of template.matchAll(TEMPLATE_PATTERN)) {
    const name = match[1]?.trim();
    if (name && !DYNAMIC_VARIABLES.includes(name as (typeof DYNAMIC_VARIABLES)[number])) {
      seen.add(name);
    }
  }
  return Array.from(seen);
}

export function scopeToRecord(
  entries: Array<{ key: string; value: string; enabled: boolean }>
): Record<string, string> {
  const record: Record<string, string> = {};
  for (const entry of entries) {
    if (entry.enabled && entry.key) record[entry.key] = entry.value;
  }
  return record;
}

export function isTemplate(value: string): boolean {
  TEMPLATE_PATTERN.lastIndex = 0;
  return TEMPLATE_PATTERN.test(value);
}
