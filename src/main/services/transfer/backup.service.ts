/**
 * Full-workspace backup and restore.
 *
 * Export reads raw database rows (including encrypted secret values). Restore
 * preserves ids, timestamps, active flags and encrypted values, and never logs
 * variable contents.
 */
import type { AppPreference, TransferResult } from '@shared/types';
import type { CollectionRepository } from '../../repositories/collection.repository';
import type { EnvironmentRepository } from '../../repositories/environment.repository';
import type { PreferenceRepository } from '../../repositories/preference.repository';
import type { RequestRepository } from '../../repositories/request.repository';
import type { PigeonDatabase } from '../database';
import { createLogger } from '../../utils/logger';
import { orderCollections, summarizeBackup, validateBackup } from './backup-format';
import {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupCollectionRow,
  type BackupEnvironmentEntry,
  type BackupEnvironmentRow,
  type BackupRequestRow,
  type BackupVariableRow,
  type PigeonBackup
} from './backup.types';

const logger = createLogger('backup');

export {
  BACKUP_FORMAT,
  BACKUP_VERSION,
  type BackupCollectionRow,
  type BackupEnvironmentEntry,
  type BackupEnvironmentRow,
  type BackupRequestRow,
  type BackupVariableRow,
  type PigeonBackup,
  type ValidatedBackup
} from './backup.types';
export { validateBackup } from './backup-format';

export class BackupService {
  constructor(
    private readonly db: PigeonDatabase,
    _collections: CollectionRepository,
    _requests: RequestRepository,
    _environments: EnvironmentRepository,
    private readonly preferences: PreferenceRepository,
    private readonly workspaceId: () => string = () => ''
  ) {}

  exportBackup(): PigeonBackup {
    const workspaceId = this.workspaceId();
    const collections = this.allRows<BackupCollectionRow>(
      'SELECT * FROM collections WHERE workspace_id = ? ORDER BY sort_order ASC, created_at ASC',
      workspaceId
    );
    const requests = this.allRows<BackupRequestRow>(
      'SELECT * FROM requests WHERE workspace_id = ? ORDER BY sort_order ASC, created_at ASC',
      workspaceId
    );
    const environmentRows = this.allRows<BackupEnvironmentRow>(
      'SELECT * FROM environments WHERE workspace_id = ? ORDER BY created_at ASC',
      workspaceId
    );
    const variables = this.allRows<BackupVariableRow>(
      'SELECT * FROM environment_variables WHERE workspace_id = ? ORDER BY sort_order ASC',
      workspaceId
    );
    const byEnvironment = new Map<string, BackupVariableRow[]>();
    const globals: BackupVariableRow[] = [];
    for (const variable of variables) {
      if (variable.environment_id === null) {
        globals.push(variable);
        continue;
      }
      const bucket = byEnvironment.get(variable.environment_id) ?? [];
      bucket.push(variable);
      byEnvironment.set(variable.environment_id, bucket);
    }
    const environments: BackupEnvironmentEntry[] = environmentRows.map((row) => ({
      ...row,
      variables: byEnvironment.get(row.id) ?? []
    }));
    logger.info('Backup exported', {
      collections: collections.length,
      requests: requests.length,
      environments: environments.length,
      globals: globals.length
    });
    return {
      format: BACKUP_FORMAT,
      version: BACKUP_VERSION,
      exportedAt: new Date().toISOString(),
      collections,
      requests,
      environments,
      globals,
      preferences: this.preferences.get()
    };
  }

  restoreBackup(raw: unknown): TransferResult {
    const backup = validateBackup(raw);
    const collections = orderCollections(backup.collections);
    this.db.transaction(() => {
      this.clearWorkspace();
      this.insertCollections(collections);
      this.insertRequests(backup.requests);
      this.insertEnvironments(backup.environments, backup.globals);
      this.restorePreferences(backup.preferences);
    });
    const summary = summarizeBackup(backup);
    logger.info('Backup restored', {
      collections: summary.collections,
      folders: summary.folders,
      requests: summary.requests,
      environments: summary.environments,
      skipped: summary.skipped
    });
    return {
      summary,
      importedCollectionIds: backup.collections
        .filter((row) => row.type === 'collection')
        .map((row) => row.id)
    };
  }

  private clearWorkspace(): void {
    const workspaceId = this.workspaceId();
    this.db.prepare('DELETE FROM requests WHERE workspace_id = ?').run(workspaceId);
    this.db.prepare('DELETE FROM collections WHERE workspace_id = ?').run(workspaceId);
    this.db.prepare('DELETE FROM environment_variables WHERE workspace_id = ?').run(workspaceId);
    this.db.prepare('DELETE FROM environments WHERE workspace_id = ?').run(workspaceId);
  }

  private insertCollections(rows: BackupCollectionRow[]): void {
    const insert = this.db.prepare(
      `INSERT INTO collections (id, name, description, parent_id, type, pre_request_script, test_script,
        sort_order, cloud_id, sync_version, is_dirty, created_at, updated_at, workspace_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const row of rows) {
      insert.run(
        row.id,
        row.name,
        row.description,
        row.parent_id,
        row.type,
        row.pre_request_script,
        row.test_script,
        row.sort_order,
        row.cloud_id,
        row.sync_version,
        row.is_dirty,
        row.created_at,
        row.updated_at,
        this.workspaceId()
      );
    }
  }

  private insertRequests(rows: BackupRequestRow[]): void {
    const insert = this.db.prepare(
      `INSERT INTO requests (id, collection_id, name, method, url, query_params, headers, body,
        pre_request_script, test_script, auth, sort_order, cloud_id, sync_version, is_dirty, created_at, updated_at,
        workspace_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const row of rows) {
      insert.run(
        row.id,
        row.collection_id,
        row.name,
        row.method,
        row.url,
        row.query_params,
        row.headers,
        row.body,
        row.pre_request_script,
        row.test_script,
        row.auth,
        row.sort_order,
        row.cloud_id,
        row.sync_version,
        row.is_dirty,
        row.created_at,
        row.updated_at,
        this.workspaceId()
      );
    }
  }

  private insertEnvironments(environments: BackupEnvironmentEntry[], globals: BackupVariableRow[]): void {
    const insertEnvironment = this.db.prepare(
      `INSERT INTO environments (id, name, is_active, cloud_id, sync_version, is_dirty, created_at, updated_at,
        workspace_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    const insertVariable = this.db.prepare(
      `INSERT INTO environment_variables (id, environment_id, key, value, is_secret, enabled, sort_order,
        created_at, updated_at, workspace_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    );
    for (const environment of environments) {
      insertEnvironment.run(
        environment.id,
        environment.name,
        environment.is_active,
        environment.cloud_id,
        environment.sync_version,
        environment.is_dirty,
        environment.created_at,
        environment.updated_at,
        this.workspaceId()
      );
      for (const variable of environment.variables) {
        insertVariable.run(
          variable.id,
          variable.environment_id,
          variable.key,
          variable.value,
          variable.is_secret,
          variable.enabled,
          variable.sort_order,
          variable.created_at,
          variable.updated_at,
          this.workspaceId()
        );
      }
    }
    for (const variable of globals) {
      insertVariable.run(
        variable.id,
        null,
        variable.key,
        variable.value,
        variable.is_secret,
        variable.enabled,
        variable.sort_order,
        variable.created_at,
        variable.updated_at,
        this.workspaceId()
      );
    }
  }

  private allRows<T>(sql: string, ...params: Array<string | number | null>): T[] {
    return this.db.prepare(sql).all(...params) as unknown as T[];
  }

  private restorePreferences(incoming: Partial<AppPreference> | null): void {
    if (!incoming) return;
    const current = this.preferences.get();
    // mergePreference in the repository also forces the current data directory.
    this.preferences.save({ ...current, ...incoming, dataDir: current.dataDir });
  }
}
