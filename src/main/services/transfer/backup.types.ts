/**
 * Pigeon backup file schema (version 1). Rows mirror the local tables verbatim,
 * including encrypted secret values.
 */
import type { AppPreference } from '@shared/types';

export const BACKUP_FORMAT = 'pigeon-backup';
export const BACKUP_VERSION = 1;

export interface BackupCollectionRow {
  id: string;
  name: string;
  description: string;
  parent_id: string | null;
  type: 'collection' | 'folder';
  pre_request_script: string;
  test_script: string;
  sort_order: number;
  cloud_id: string | null;
  sync_version: number | null;
  is_dirty: number;
  created_at: number;
  updated_at: number;
}

export interface BackupRequestRow {
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

export interface BackupEnvironmentRow {
  id: string;
  name: string;
  is_active: number;
  cloud_id: string | null;
  sync_version: number | null;
  is_dirty: number;
  created_at: number;
  updated_at: number;
}

export interface BackupVariableRow {
  id: string;
  environment_id: string | null;
  key: string;
  value: string;
  is_secret: number;
  enabled: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface BackupEnvironmentEntry extends BackupEnvironmentRow {
  variables: BackupVariableRow[];
}

export interface PigeonBackup {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  exportedAt: string;
  collections: BackupCollectionRow[];
  requests: BackupRequestRow[];
  environments: BackupEnvironmentEntry[];
  globals: BackupVariableRow[];
  preferences: AppPreference | null;
}

export interface ValidatedBackup {
  collections: BackupCollectionRow[];
  requests: BackupRequestRow[];
  environments: BackupEnvironmentEntry[];
  globals: BackupVariableRow[];
  preferences: Partial<AppPreference> | null;
  warnings: string[];
  skipped: number;
}
