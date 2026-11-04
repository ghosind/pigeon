import { createEmptyAuth, createEmptyBody } from '@shared/defaults';
import type { AuthConfig, ParamItem, RequestBody, SavedRequest } from '@shared/types';
import { AppError } from '../utils/errors';

export interface SavedRequestRow {
  id: string;
  collection_id: string;
  name: string;
  method: string;
  url: string;
  query_params: string;
  headers: string;
  body: string;
  pre_request_script: string;
  test_script: string;
  auth: string;
  sort_order: number;
  cloud_id: string | null;
  sync_version: number | null;
  is_dirty: number;
  created_at: number;
  updated_at: number;
}

export function parseArray(value: string): ParamItem[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === 'object')
      .map((entry) => ({
        key: typeof entry.key === 'string' ? entry.key : '',
        value: typeof entry.value === 'string' ? entry.value : '',
        enabled: entry.enabled !== false,
        description: typeof entry.description === 'string' ? entry.description : '',
        ...(typeof entry.type === 'string' ? { type: entry.type as 'text' | 'file' } : {}),
        ...(typeof entry.filePath === 'string' ? { filePath: entry.filePath } : {})
      }));
  } catch (error) {
    throw new AppError('DATABASE_ERROR', 'Stored request parameters are corrupted', String(error));
  }
}

export function parseJsonObject<T>(value: string, fallback: T): T {
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return fallback;
    return { ...fallback, ...(parsed as T) };
  } catch {
    return fallback;
  }
}

export function mapRequestRow(row: SavedRequestRow): SavedRequest {
  const body = parseJsonObject<RequestBody>(row.body, createEmptyBody());
  body.formdata = Array.isArray(body.formdata) ? body.formdata : [];
  body.urlencoded = Array.isArray(body.urlencoded) ? body.urlencoded : [];
  const auth = parseJsonObject<AuthConfig>(row.auth, createEmptyAuth());
  return {
    id: row.id,
    collectionId: row.collection_id,
    name: row.name,
    method: row.method as SavedRequest['method'],
    url: row.url,
    queryParams: parseArray(row.query_params),
    headers: parseArray(row.headers),
    body,
    preRequestScript: row.pre_request_script,
    testScript: row.test_script,
    auth,
    order: row.sort_order,
    cloudId: row.cloud_id ?? undefined,
    syncVersion: row.sync_version ?? undefined,
    isDirty: Boolean(row.is_dirty),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}
