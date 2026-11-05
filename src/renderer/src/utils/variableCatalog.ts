import type { CollectionNode, Environment, EnvironmentVariable, VariableEntry } from '@shared/types';

export type VariableScope = 'environment' | 'folder' | 'global' | 'dynamic';

export interface VariableInfo {
  name: string;
  value: string;
  scope: VariableScope;
  secret: boolean;
}

const DYNAMIC_VARIABLES: Array<{ name: string; value: () => string }> = [
  { name: '$timestamp', value: () => String(Math.floor(Date.now() / 1000)) },
  { name: '$isoTimestamp', value: () => new Date().toISOString() },
  { name: '$guid', value: () => globalThis.crypto.randomUUID() },
  { name: '$randomUUID', value: () => globalThis.crypto.randomUUID() },
  { name: '$randomInt', value: () => String(Math.floor(Math.random() * 1000)) }
];

function displayValue(variable: EnvironmentVariable): string {
  if (!variable.secret) return variable.value;
  return variable.hasValue ? '••••••••' : '';
}

function addVariables(
  target: Map<string, VariableInfo>,
  variables: EnvironmentVariable[],
  scope: VariableScope
): void {
  for (const variable of variables) {
    if (!variable.enabled || !variable.key) continue;
    target.set(variable.key, {
      name: variable.key,
      value: displayValue(variable),
      scope,
      secret: variable.secret
    });
  }
}

function addScopedVariables(
  target: Map<string, VariableInfo>,
  variables: VariableEntry[],
  scope: VariableScope
): void {
  for (const variable of variables) {
    if (!variable.enabled || !variable.key) continue;
    target.set(variable.key, {
      name: variable.key,
      value: variable.value,
      scope,
      secret: false
    });
  }
}

/** Folder chain variables (outermost first, nearest folder last). */
export function folderVariableEntries(collectionId: string | undefined, nodes: CollectionNode[]): VariableEntry[] {
  if (!collectionId) return [];
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const chain: CollectionNode[] = [];
  const seen = new Set<string>();
  let current = byId.get(collectionId);
  while (current && !seen.has(current.id)) {
    seen.add(current.id);
    chain.unshift(current);
    current = current.parentId ? byId.get(current.parentId) : undefined;
  }
  return chain.flatMap((node) => node.variables ?? []);
}

/**
 * Builds the variable catalog used by autocomplete and hover hints.
 * Environment variables override globals; dynamic variables are last.
 */
export function buildVariableCatalog(
  environments: Environment[],
  globals: EnvironmentVariable[],
  folderVariables: VariableEntry[] = []
): VariableInfo[] {
  const catalog = new Map<string, VariableInfo>();
  addVariables(catalog, globals, 'global');
  addScopedVariables(catalog, folderVariables, 'folder');
  const active = environments.find((environment) => environment.isActive);
  addVariables(catalog, active?.variables ?? [], 'environment');
  for (const dynamic of DYNAMIC_VARIABLES) {
    if (!catalog.has(dynamic.name)) {
      catalog.set(dynamic.name, {
        name: dynamic.name,
        value: dynamic.value(),
        scope: 'dynamic',
        secret: false
      });
    }
  }
  return Array.from(catalog.values());
}

export function variableMap(catalog: VariableInfo[]): Map<string, VariableInfo> {
  return new Map(catalog.map((variable) => [variable.name, variable]));
}
