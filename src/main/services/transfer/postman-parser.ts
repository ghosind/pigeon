/**
 * Pure Postman Collection v2.1 / Environment parsing.
 * No database access, so every function here is unit-testable in isolation.
 */
import type { EnvironmentVariable, RequestDefinition } from '@shared/types';
import { AppError } from '../../utils/errors';
import {
  asRecord,
  descriptionOf,
  parseRequestDefinition,
  parseScripts,
  textOf
} from './postman-mapping';

export const MAX_ITEMS = 5000;
const MAX_DEPTH = 32;

export interface ParsedFolderNode {
  kind: 'folder';
  name: string;
  description: string;
  preRequestScript: string;
  testScript: string;
  items: ParsedNode[];
}

export interface ParsedRequestNode {
  kind: 'request';
  name: string;
  request: RequestDefinition;
}

export type ParsedNode = ParsedFolderNode | ParsedRequestNode;

export interface ParsedPostmanCollection {
  name: string;
  description: string;
  preRequestScript: string;
  testScript: string;
  nodes: ParsedNode[];
  warnings: string[];
  counts: { folders: number; requests: number; skipped: number };
}

export interface ParsedPostmanEnvironment {
  name: string;
  variables: EnvironmentVariable[];
  warnings: string[];
}

interface ParseState {
  count: number;
  folders: number;
  requests: number;
  skipped: number;
  truncated: boolean;
  depthWarned: boolean;
}

function coerceFile(raw: unknown): Record<string, unknown> {
  if (typeof raw === 'string') {
    try {
      return asRecord(JSON.parse(raw)) ?? failJson();
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError('IMPORT_ERROR', 'The selected file does not contain valid JSON');
    }
  }
  return asRecord(raw) ?? failJson();
}

function failJson(): never {
  throw new AppError('IMPORT_ERROR', 'The selected file does not contain a Postman document');
}

function parseItems(items: unknown[], depth: number, warnings: string[], state: ParseState): ParsedNode[] {
  const nodes: ParsedNode[] = [];
  if (depth > MAX_DEPTH) {
    if (!state.depthWarned) {
      state.depthWarned = true;
      warnings.push(`Folders nested deeper than ${MAX_DEPTH} levels were skipped.`);
    }
    return nodes;
  }
  for (const entry of items) {
    if (state.count >= MAX_ITEMS) {
      if (!state.truncated) {
        state.truncated = true;
        warnings.push(`The collection contains more than ${MAX_ITEMS} items; the rest were skipped.`);
      }
      break;
    }
    const record = asRecord(entry);
    if (!record) {
      state.skipped += 1;
      continue;
    }
    state.count += 1;
    const name = textOf(record.name).trim();
    if (Array.isArray(record.item)) {
      const scripts = parseScripts(record.event);
      const children = parseItems(record.item, depth + 1, warnings, state);
      nodes.push({
        kind: 'folder',
        name: name || 'Untitled folder',
        description: descriptionOf(record.description),
        preRequestScript: scripts.preRequestScript,
        testScript: scripts.testScript,
        items: children
      });
      state.folders += 1;
      continue;
    }
    if (record.request !== undefined) {
      const definition = parseRequestDefinition(record, name || 'Untitled request', warnings);
      const scripts = parseScripts(record.event);
      definition.preRequestScript = scripts.preRequestScript;
      definition.testScript = scripts.testScript;
      nodes.push({ kind: 'request', name: definition.name, request: definition });
      state.requests += 1;
      continue;
    }
    state.skipped += 1;
    warnings.push(`Skipped "${name || 'unnamed item'}" because it is neither a folder nor a request.`);
  }
  return nodes;
}

export function parsePostmanCollection(raw: unknown): ParsedPostmanCollection {
  const root = coerceFile(raw);
  if (!Array.isArray(root.item)) {
    throw new AppError('IMPORT_ERROR', 'This file is not a Postman collection (missing item array)');
  }
  const info = asRecord(root.info) ?? {};
  const warnings: string[] = [];
  const state: ParseState = {
    count: 0,
    folders: 0,
    requests: 0,
    skipped: 0,
    truncated: false,
    depthWarned: false
  };
  const nodes = parseItems(root.item, 0, warnings, state);
  const scripts = parseScripts(root.event);
  return {
    name: textOf(info.name).trim() || 'Imported collection',
    description: descriptionOf(info.description),
    preRequestScript: scripts.preRequestScript,
    testScript: scripts.testScript,
    nodes,
    warnings,
    counts: { folders: state.folders, requests: state.requests, skipped: state.skipped }
  };
}

export function parsePostmanEnvironment(raw: unknown): ParsedPostmanEnvironment {
  const root = coerceFile(raw);
  const values = Array.isArray(root.values) ? root.values : Array.isArray(root.variables) ? root.variables : null;
  if (!values) {
    throw new AppError('IMPORT_ERROR', 'This file is not a Postman environment (missing values array)');
  }
  const variables: EnvironmentVariable[] = [];
  let skipped = 0;
  for (const entry of values) {
    const record = asRecord(entry);
    if (!record) {
      skipped += 1;
      continue;
    }
    const key = textOf(record.key).trim();
    if (!key) {
      skipped += 1;
      continue;
    }
    variables.push({
      key,
      value: textOf(record.value),
      secret: textOf(record.type).toLowerCase() === 'secret',
      enabled: record.enabled !== false
    });
  }
  const warnings: string[] = [];
  if (skipped > 0) warnings.push(`${skipped} environment variables without a key were skipped.`);
  return { name: textOf(root.name).trim() || 'Imported environment', variables, warnings };
}
