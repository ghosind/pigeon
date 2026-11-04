/**
 * Pigeon backup validation and ordering helpers.
 */
import type { AppPreference, ImportSummary } from '@shared/types';
import { AppError } from '../../utils/errors';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupCollectionRow,
  type BackupEnvironmentEntry,
  type BackupRequestRow,
  type BackupVariableRow,
  type ValidatedBackup
} from './backup.types';

type Row = Record<string, unknown>;

function asRecord(value: unknown): Row | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value) ? (value as Row) : undefined;
}

function text(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

function nullableText(value: unknown): string | null {
  return value === null || value === undefined || value === '' ? null : text(value);
}

function number(value: unknown, fallback: number): number {
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function nullableNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function flag(value: unknown, fallback = 0): number {
  if (value === undefined || value === null) return fallback;
  if (value === true) return 1;
  if (value === false) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? (parsed ? 1 : 0) : fallback;
}

function jsonText(value: unknown, fallback: string): string {
  if (typeof value === 'string') return value;
  if (value === undefined || value === null) return fallback;
  try {
    return JSON.stringify(value);
  } catch {
    return fallback;
  }
}

function coerceBackup(raw: unknown): Row {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      throw new AppError('IMPORT_ERROR', 'The selected file does not contain valid JSON');
    }
  }
  const record = asRecord(value);
  if (!record) throw new AppError('VALIDATION_ERROR', 'This file is not a Pigeon backup.');
  if (record.format !== BACKUP_FORMAT) {
    throw new AppError('VALIDATION_ERROR', 'This file is not a Pigeon backup (unexpected format).');
  }
  if (record.version !== BACKUP_VERSION) {
    throw new AppError('VALIDATION_ERROR', `Unsupported backup version: ${text(record.version) || 'unknown'}.`);
  }
  return record;
}

function toRows<T>(value: unknown, label: string, map: (row: Row) => T | null): { rows: T[]; skipped: number } {
  if (!Array.isArray(value)) {
    throw new AppError('IMPORT_ERROR', `The backup is missing its ${label} array.`);
  }
  const rows: T[] = [];
  let skipped = 0;
  for (const entry of value) {
    const record = asRecord(entry);
    const mapped = record ? map(record) : null;
    if (mapped === null) skipped += 1;
    else rows.push(mapped);
  }
  return { rows, skipped };
}

function toCollection(row: Row): BackupCollectionRow | null {
  const id = text(row.id);
  const name = text(row.name);
  const type = row.type === 'folder' ? 'folder' : row.type === 'collection' ? 'collection' : null;
  if (!id || !name || !type) return null;
  return {
    id,
    name,
    description: text(row.description),
    parent_id: nullableText(row.parent_id),
    type,
    pre_request_script: text(row.pre_request_script),
    test_script: text(row.test_script),
    sort_order: number(row.sort_order, 0),
    cloud_id: nullableText(row.cloud_id),
    sync_version: nullableNumber(row.sync_version),
    is_dirty: flag(row.is_dirty),
    created_at: number(row.created_at, Date.now()),
    updated_at: number(row.updated_at, Date.now())
  };
}

function toRequest(row: Row): BackupRequestRow | null {
  const id = text(row.id);
  const collectionId = text(row.collection_id);
  const name = text(row.name);
  if (!id || !collectionId || !name) return null;
  return {
    id,
    collection_id: collectionId,
    name,
    method: text(row.method) || 'GET',
    url: text(row.url),
    query_params: jsonText(row.query_params, '[]'),
    headers: jsonText(row.headers, '[]'),
    body: jsonText(row.body, '{}'),
    pre_request_script: text(row.pre_request_script),
    test_script: text(row.test_script),
    auth: jsonText(row.auth, '{}'),
    sort_order: number(row.sort_order, 0),
    cloud_id: nullableText(row.cloud_id),
    sync_version: nullableNumber(row.sync_version),
    is_dirty: flag(row.is_dirty),
    created_at: number(row.created_at, Date.now()),
    updated_at: number(row.updated_at, Date.now())
  };
}

function toVariable(row: Row, environmentId: string | null): BackupVariableRow | null {
  const id = text(row.id);
  const key = text(row.key);
  if (!id || !key) return null;
  return {
    id,
    environment_id: environmentId,
    key,
    value: text(row.value),
    is_secret: flag(row.is_secret),
    enabled: flag(row.enabled, 1),
    sort_order: number(row.sort_order, 0),
    created_at: number(row.created_at, Date.now()),
    updated_at: number(row.updated_at, Date.now())
  };
}

function toEnvironment(row: Row): BackupEnvironmentEntry | null {
  const id = text(row.id);
  const name = text(row.name);
  if (!id || !name) return null;
  const variables: BackupVariableRow[] = [];
  if (Array.isArray(row.variables)) {
    for (const entry of row.variables) {
      const record = asRecord(entry);
      const variable = record ? toVariable(record, id) : null;
      if (variable) variables.push(variable);
    }
  }
  return {
    id,
    name,
    is_active: flag(row.is_active),
    cloud_id: nullableText(row.cloud_id),
    sync_version: nullableNumber(row.sync_version),
    is_dirty: flag(row.is_dirty),
    created_at: number(row.created_at, Date.now()),
    updated_at: number(row.updated_at, Date.now()),
    variables
  };
}

/** Validates the envelope and sanitizes rows before any database write. */
export function validateBackup(raw: unknown): ValidatedBackup {
  const data = coerceBackup(raw);
  const collections = toRows(data.collections, 'collections', toCollection);
  const requests = toRows(data.requests, 'requests', toRequest);
  const environments = toRows(data.environments, 'environments', toEnvironment);
  const globals = toRows(data.globals, 'globals', (row) => toVariable(row, null));
  const warnings: string[] = [];
  let skipped = collections.skipped + requests.skipped + environments.skipped + globals.skipped;

  const collectionIds = new Set(collections.rows.map((row) => row.id));
  let orphaned = 0;
  for (const node of collections.rows) {
    if (node.parent_id && !collectionIds.has(node.parent_id)) {
      node.parent_id = null;
      orphaned += 1;
    }
  }
  if (orphaned > 0) {
    warnings.push(`${orphaned} collection nodes referenced a missing parent and were restored at the root.`);
  }

  const requestsWithParent = requests.rows.filter((row) => collectionIds.has(row.collection_id));
  if (requestsWithParent.length !== requests.rows.length) {
    const dropped = requests.rows.length - requestsWithParent.length;
    skipped += dropped;
    warnings.push(`${dropped} requests referenced a missing collection and were skipped.`);
  }
  if (skipped > 0) warnings.push(`${skipped} malformed backup rows were skipped.`);

  let preferences: Partial<AppPreference> | null = null;
  if (data.preferences !== null && data.preferences !== undefined) {
    const record = asRecord(data.preferences);
    if (!record) throw new AppError('IMPORT_ERROR', 'The backup preferences payload is malformed.');
    preferences = record as Partial<AppPreference>;
  }

  return {
    collections: collections.rows,
    requests: requestsWithParent,
    environments: environments.rows,
    globals: globals.rows,
    preferences,
    warnings,
    skipped
  };
}

/** Parents must be inserted before children to satisfy the foreign key. */
export function orderCollections(rows: BackupCollectionRow[]): BackupCollectionRow[] {
  const byId = new Map(rows.map((row) => [row.id, row]));
  const depthOf = (row: BackupCollectionRow): number => {
    let depth = 0;
    let current = row;
    const seen = new Set<string>();
    while (current.parent_id && depth < 64) {
      if (seen.has(current.id)) break;
      seen.add(current.id);
      const parent = byId.get(current.parent_id);
      if (!parent) break;
      current = parent;
      depth += 1;
    }
    return depth;
  };
  return [...rows].sort((left, right) => depthOf(left) - depthOf(right));
}

export function summarizeBackup(backup: ValidatedBackup): ImportSummary {
  return {
    collections: backup.collections.filter((row) => row.type === 'collection').length,
    folders: backup.collections.filter((row) => row.type === 'folder').length,
    requests: backup.requests.length,
    environments: backup.environments.length,
    skipped: backup.skipped,
    warnings: backup.warnings
  };
}
