import { randomUUID } from 'node:crypto';
import type { EnvironmentCreateInput, EnvironmentUpdateInput, RevealVariableInput } from '@shared/ipc';
import type { Environment, EnvironmentVariable } from '@shared/types';
import type { PigeonDatabase } from '../services/database';
import type { CryptoService } from '../services/crypto.service';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('environments');

interface EnvironmentRow {
  id: string;
  workspace_id: string;
  name: string;
  is_active: number;
  cloud_id: string | null;
  sync_version: number | null;
  is_dirty: number;
  created_at: number;
  updated_at: number;
}

interface VariableRow {
  id: string;
  workspace_id: string;
  environment_id: string | null;
  key: string;
  value: string;
  is_secret: number;
  enabled: number;
  sort_order: number;
  created_at: number;
  updated_at: number;
}

export interface RuntimeScopes {
  environment: Record<string, string>;
  globals: Record<string, string>;
  environmentId: string | null;
  environmentName: string;
}

export class EnvironmentRepository {
  constructor(
    private readonly db: PigeonDatabase,
    private readonly crypto: CryptoService,
    private readonly workspaceId: () => string
  ) {}

  list(): Environment[] {
    const environments = this.db
      .prepare('SELECT * FROM environments WHERE workspace_id = ? ORDER BY created_at ASC')
      .all(this.workspaceId()) as unknown as EnvironmentRow[];
    return environments.map((row) => this.toEnvironment(row));
  }

  get(id: string): Environment | undefined {
    const row = this.db
      .prepare('SELECT * FROM environments WHERE id = ? AND workspace_id = ?')
      .get(id, this.workspaceId()) as EnvironmentRow | undefined;
    return row ? this.toEnvironment(row) : undefined;
  }

  create(input: EnvironmentCreateInput): Environment {
    const name = input.name.trim();
    if (!name) throw new AppError('VALIDATION_ERROR', 'Environment name cannot be empty');
    const id = randomUUID();
    const now = Date.now();
    const workspaceId = this.workspaceId();
    const activeRow = this.db
      .prepare('SELECT id FROM environments WHERE is_active = 1 AND workspace_id = ?')
      .get(workspaceId) as { id: string } | undefined;
    this.db.transaction(() => {
      this.db
        .prepare(
          'INSERT INTO environments (id, workspace_id, name, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?)'
        )
        .run(id, workspaceId, name, activeRow ? 0 : 1, now, now);
      if (input.variables?.length) this.saveVariables(id, input.variables);
    });
    logger.info('Environment created', { id });
    return this.get(id)!;
  }

  update(input: EnvironmentUpdateInput): Environment {
    const existing = this.get(input.id);
    if (!existing) throw new AppError('NOT_FOUND', 'Environment was not found');
    if (input.name !== undefined && !input.name.trim()) {
      throw new AppError('VALIDATION_ERROR', 'Environment name cannot be empty');
    }
    this.db.transaction(() => {
      if (input.name !== undefined) {
        this.db
          .prepare('UPDATE environments SET name = ?, is_dirty = 1, updated_at = ? WHERE id = ? AND workspace_id = ?')
          .run(input.name.trim(), Date.now(), input.id, this.workspaceId());
      }
      if (input.variables !== undefined) {
        this.saveVariables(input.id, input.variables);
        this.db
          .prepare('UPDATE environments SET updated_at = ? WHERE id = ? AND workspace_id = ?')
          .run(Date.now(), input.id, this.workspaceId());
      }
    });
    logger.info('Environment updated', { id: input.id, variableCount: input.variables?.length });
    return this.get(input.id)!;
  }

  delete(id: string): void {
    const existing = this.get(id);
    if (!existing) throw new AppError('NOT_FOUND', 'Environment was not found');
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM environments WHERE id = ? AND workspace_id = ?').run(id, this.workspaceId());
      if (existing.isActive) {
        const fallback = this.db
          .prepare('SELECT id FROM environments WHERE workspace_id = ? ORDER BY created_at ASC LIMIT 1')
          .get(this.workspaceId()) as { id: string } | undefined;
        if (fallback) {
          this.db.prepare('UPDATE environments SET is_active = 1 WHERE id = ?').run(fallback.id);
        }
      }
    });
    logger.info('Environment deleted', { id });
  }

  activate(id: string): Environment[] {
    if (!this.get(id)) throw new AppError('NOT_FOUND', 'Environment was not found');
    this.db.transaction(() => {
      this.db.prepare('UPDATE environments SET is_active = 0 WHERE workspace_id = ?').run(this.workspaceId());
      this.db
        .prepare('UPDATE environments SET is_active = 1, updated_at = ? WHERE id = ? AND workspace_id = ?')
        .run(Date.now(), id, this.workspaceId());
    });
    logger.info('Environment activated', { id });
    return this.list();
  }

  reveal(input: RevealVariableInput): string {
    const row = this.db
      .prepare(
        `SELECT * FROM environment_variables
         WHERE key = ? AND workspace_id = ? AND ${input.environmentId === null ? 'environment_id IS NULL' : 'environment_id = ?'}`
      )
      .get(
        ...(input.environmentId === null
          ? [input.key, this.workspaceId()]
          : [input.key, this.workspaceId(), input.environmentId])
      ) as VariableRow | undefined;
    if (!row) throw new AppError('NOT_FOUND', 'Variable was not found');
    return row.is_secret ? this.crypto.decrypt(row.value) : row.value;
  }

  globals(): EnvironmentVariable[] {
    const rows = this.db
      .prepare('SELECT * FROM environment_variables WHERE workspace_id = ? AND environment_id IS NULL ORDER BY sort_order ASC')
      .all(this.workspaceId()) as unknown as VariableRow[];
    return rows.map((row) => this.toVariableView(row));
  }

  saveGlobals(variables: EnvironmentVariable[]): EnvironmentVariable[] {
    this.db.transaction(() => this.saveVariables(null, variables));
    logger.info('Global variables saved', { count: variables.length });
    return this.globals();
  }

  /** Decrypted variables for the request engine. Disabled rows are excluded. */
  runtimeScopes(environmentId?: string): RuntimeScopes {
    const workspaceId = this.workspaceId();
    const envRow = environmentId
      ? (this.db
          .prepare('SELECT * FROM environments WHERE id = ? AND workspace_id = ?')
          .get(environmentId, workspaceId) as EnvironmentRow | undefined)
      : (this.db
          .prepare('SELECT * FROM environments WHERE is_active = 1 AND workspace_id = ?')
          .get(workspaceId) as EnvironmentRow | undefined);
    const environment: Record<string, string> = {};
    if (envRow) {
      const rows = this.db
        .prepare('SELECT * FROM environment_variables WHERE workspace_id = ? AND environment_id = ? AND enabled = 1 ORDER BY sort_order ASC')
        .all(workspaceId, envRow.id) as unknown as VariableRow[];
      for (const row of rows) {
        environment[row.key] = this.decryptRow(row);
      }
    }
    const globals: Record<string, string> = {};
    const globalRows = this.db
      .prepare('SELECT * FROM environment_variables WHERE workspace_id = ? AND environment_id IS NULL AND enabled = 1 ORDER BY sort_order ASC')
      .all(workspaceId) as unknown as VariableRow[];
    for (const row of globalRows) {
      globals[row.key] = this.decryptRow(row);
    }
    return {
      environment,
      globals,
      environmentId: envRow?.id ?? null,
      environmentName: envRow?.name ?? 'No environment'
    };
  }

  /** Applies script-driven variable writes, preserving secret-at-rest semantics. */
  applyRuntimeUpdates(
    environmentId: string | null,
    environmentUpdates: Record<string, string>,
    globalUpdates: Record<string, string>
  ): void {
    if (environmentId) {
      for (const [key, value] of Object.entries(environmentUpdates)) {
        this.upsertSingle(environmentId, key, value);
      }
    }
    for (const [key, value] of Object.entries(globalUpdates)) {
      this.upsertSingle(null, key, value);
    }
  }

  private upsertSingle(environmentId: string | null, key: string, value: string): void {
    const workspaceId = this.workspaceId();
    const existing = this.db
      .prepare(
        `SELECT * FROM environment_variables
         WHERE key = ? AND workspace_id = ? AND ${environmentId === null ? 'environment_id IS NULL' : 'environment_id = ?'}`
      )
      .get(
        ...(environmentId === null
          ? [key, workspaceId]
          : [key, workspaceId, environmentId])
      ) as VariableRow | undefined;
    const now = Date.now();
    const stored = existing?.is_secret ? this.crypto.encrypt(value) : value;
    if (existing) {
      this.db
        .prepare('UPDATE environment_variables SET value = ?, updated_at = ? WHERE id = ? AND workspace_id = ?')
        .run(stored, now, existing.id, workspaceId);
      return;
    }
    this.db
      .prepare(
        `INSERT INTO environment_variables (id, workspace_id, environment_id, key, value, is_secret, enabled,
          sort_order, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, 0, 1, ?, ?, ?)`
      )
      .run(randomUUID(), workspaceId, environmentId, key, stored, now, now, now);
  }

  /** Deletes and recreates the variable list while preserving masked secrets. */
  private saveVariables(environmentId: string | null, incoming: EnvironmentVariable[]): void {
    const workspaceId = this.workspaceId();
    const existingRows = this.db
      .prepare(
        `SELECT * FROM environment_variables
         WHERE workspace_id = ? AND ${environmentId === null ? 'environment_id IS NULL' : 'environment_id = ?'}`
      )
      .all(
        ...(environmentId === null
          ? [workspaceId]
          : [workspaceId, environmentId])
      ) as unknown as VariableRow[];
    const existingByKey = new Map(existingRows.map((row) => [row.key, row]));
    const deduped = new Map<string, EnvironmentVariable>();
    for (const variable of incoming) {
      const key = variable.key.trim();
      if (!key) continue;
      deduped.set(key, { ...variable, key });
    }

    this.db
      .prepare(
        `DELETE FROM environment_variables
         WHERE workspace_id = ? AND ${environmentId === null ? 'environment_id IS NULL' : 'environment_id = ?'}`
      )
      .run(
        ...(environmentId === null
          ? [workspaceId]
          : [workspaceId, environmentId])
      );

    let order = 1000;
    for (const variable of deduped.values()) {
      const existing = existingByKey.get(variable.key);
      const storedValue = this.resolveStoredValue(variable, existing);
      const now = Date.now();
      this.db
        .prepare(
          `INSERT INTO environment_variables (id, workspace_id, environment_id, key, value, is_secret, enabled,
            sort_order, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(
          randomUUID(),
          workspaceId,
          environmentId,
          variable.key,
          storedValue,
          variable.secret ? 1 : 0,
          variable.enabled ? 1 : 0,
          order,
          now,
          now
        );
      order += 1000;
    }
  }

  private resolveStoredValue(variable: EnvironmentVariable, existing?: VariableRow): string {
    // Masked secret values arrive as an empty string; retain the stored cipher.
    if (variable.secret && existing) {
      if (variable.value !== '') return this.crypto.encrypt(variable.value);
      if (variable.hasValue === false) return '';
      // Masked secret values arrive as an empty string; retain/re-encrypt the stored value.
      return existing.is_secret ? existing.value : this.crypto.encrypt(existing.value);
    }
    if (!variable.secret && existing?.is_secret) {
      // The user switched a secret back to plain without re-entering it.
      return variable.value !== '' ? variable.value : this.crypto.decrypt(existing.value);
    }
    return variable.value;
  }

  private decryptRow(row: VariableRow): string {
    try {
      return row.is_secret ? this.crypto.decrypt(row.value) : row.value;
    } catch (error) {
      logger.error('Failed to decrypt environment variable', { key: row.key, error: String(error) });
      throw new AppError('DATABASE_ERROR', `Unable to decrypt variable "${row.key}"`);
    }
  }

  private toVariableView(row: VariableRow): EnvironmentVariable {
    const secret = Boolean(row.is_secret);
    return {
      key: row.key,
      value: secret ? '' : row.value,
      secret,
      enabled: Boolean(row.enabled),
      hasValue: secret ? row.value.length > 0 : undefined
    };
  }

  private toEnvironment(row: EnvironmentRow): Environment {
    const variables = this.db
      .prepare('SELECT * FROM environment_variables WHERE workspace_id = ? AND environment_id = ? ORDER BY sort_order ASC')
      .all(row.workspace_id, row.id) as unknown as VariableRow[];
    return {
      id: row.id,
      name: row.name,
      isActive: Boolean(row.is_active),
      variables: variables.map((variable) => this.toVariableView(variable)),
      cloudId: row.cloud_id ?? undefined,
      syncVersion: row.sync_version ?? undefined,
      isDirty: Boolean(row.is_dirty),
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }
}
