import { randomUUID } from 'node:crypto';
import type { Workspace } from '@shared/types';
import type { PigeonDatabase } from '../services/database';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('workspaces');

interface WorkspaceRow {
  id: string;
  name: string;
  description: string;
  is_active: number;
  created_at: number;
  updated_at: number;
}

function mapRow(row: WorkspaceRow): Workspace {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class WorkspaceRepository {
  private currentId: string;

  constructor(private readonly db: PigeonDatabase) {
    this.currentId = this.ensureWorkspace();
    logger.info('Active workspace resolved', { workspaceId: this.currentId });
  }

  activeId(): string {
    return this.currentId;
  }

  list(): Workspace[] {
    const rows = this.db
      .prepare('SELECT * FROM workspaces ORDER BY created_at ASC')
      .all() as unknown as WorkspaceRow[];
    return rows.map(mapRow);
  }

  create(name: string): Workspace[] {
    const trimmed = name.trim();
    if (!trimmed) throw new AppError('VALIDATION_ERROR', 'Workspace name cannot be empty');
    const id = randomUUID();
    const now = Date.now();
    this.db.transaction(() => {
      this.db.prepare('UPDATE workspaces SET is_active = 0').run();
      this.db
        .prepare('INSERT INTO workspaces (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
        .run(id, trimmed, '', now, now);
    });
    this.currentId = id;
    logger.info('Workspace created', { id });
    return this.list();
  }

  rename(id: string, name: string): Workspace[] {
    const trimmed = name.trim();
    if (!trimmed) throw new AppError('VALIDATION_ERROR', 'Workspace name cannot be empty');
    const existing = this.db.prepare('SELECT id FROM workspaces WHERE id = ?').get(id) as { id: string } | undefined;
    if (!existing) throw new AppError('NOT_FOUND', 'Workspace was not found');
    this.db.prepare('UPDATE workspaces SET name = ?, updated_at = ? WHERE id = ?').run(trimmed, Date.now(), id);
    logger.info('Workspace renamed', { id });
    return this.list();
  }

  activate(id: string): Workspace[] {
    const existing = this.db.prepare('SELECT id FROM workspaces WHERE id = ?').get(id) as { id: string } | undefined;
    if (!existing) throw new AppError('NOT_FOUND', 'Workspace was not found');
    this.db.transaction(() => {
      this.db.prepare('UPDATE workspaces SET is_active = 0').run();
      this.db.prepare('UPDATE workspaces SET is_active = 1, updated_at = ? WHERE id = ?').run(Date.now(), id);
    });
    this.currentId = id;
    logger.info('Workspace activated', { id });
    return this.list();
  }

  delete(id: string): Workspace[] {
    const rows = this.list();
    if (rows.length <= 1) throw new AppError('VALIDATION_ERROR', 'At least one workspace is required');
    const target = rows.find((workspace) => workspace.id === id);
    if (!target) throw new AppError('NOT_FOUND', 'Workspace was not found');
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM environment_variables WHERE workspace_id = ?').run(id);
      this.db.prepare('DELETE FROM environments WHERE workspace_id = ?').run(id);
      this.db.prepare('DELETE FROM history WHERE workspace_id = ?').run(id);
      this.db.prepare('DELETE FROM requests WHERE workspace_id = ?').run(id);
      this.db.prepare('DELETE FROM collections WHERE workspace_id = ?').run(id);
      this.db.prepare('DELETE FROM workspaces WHERE id = ?').run(id);
      if (target.isActive) {
        const next = this.db
          .prepare('SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1')
          .get() as { id: string } | undefined;
        if (next) this.db.prepare('UPDATE workspaces SET is_active = 1 WHERE id = ?').run(next.id);
      }
    });
    const active = this.db
      .prepare('SELECT id FROM workspaces WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1')
      .get() as { id: string } | undefined;
    this.currentId = active?.id ?? this.ensureWorkspace();
    logger.info('Workspace deleted', { id, active: this.currentId });
    return this.list();
  }

  private ensureWorkspace(): string {
    const active = this.db
      .prepare('SELECT id FROM workspaces WHERE is_active = 1 ORDER BY created_at ASC LIMIT 1')
      .get() as { id: string } | undefined;
    if (active) return active.id;
    const any = this.db.prepare('SELECT id FROM workspaces ORDER BY created_at ASC LIMIT 1').get() as
      | { id: string }
      | undefined;
    if (any) {
      this.db.prepare('UPDATE workspaces SET is_active = 1 WHERE id = ?').run(any.id);
      return any.id;
    }
    const id = randomUUID();
    const now = Date.now();
    this.db
      .prepare('INSERT INTO workspaces (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)')
      .run(id, 'Personal', '', now, now);
    logger.info('Created fallback workspace', { id });
    return id;
  }
}
