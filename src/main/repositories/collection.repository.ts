import { randomUUID } from 'node:crypto';
import type { CollectionCreateInput, CollectionUpdateInput } from '@shared/ipc';
import type { CollectionNode, CollectionSnapshot, SavedRequest, VariableEntry } from '@shared/types';
import type { PigeonDatabase } from '../services/database';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { nextSiblingOrder } from './ordering';
import { mapRequestRow, type SavedRequestRow } from './request.mapper';
import { parseScopedVariables, scopedVariablesToRecord } from './scoped-variables';

const logger = createLogger('collections');

interface CollectionRow {
  id: string;
  workspace_id: string;
  name: string;
  description: string;
  parent_id: string | null;
  type: 'collection' | 'folder';
  pre_request_script: string;
  test_script: string;
  variables: string;
  sort_order: number;
  cloud_id: string | null;
  sync_version: number | null;
  is_dirty: number;
  created_at: number;
  updated_at: number;
}

export function mapCollectionRow(row: CollectionRow): CollectionNode {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    parentId: row.parent_id,
    type: row.type,
    preRequestScript: row.pre_request_script,
    testScript: row.test_script,
    variables: parseScopedVariables(row.variables),
    order: row.sort_order,
    cloudId: row.cloud_id ?? undefined,
    syncVersion: row.sync_version ?? undefined,
    isDirty: Boolean(row.is_dirty),
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

export class CollectionRepository {
  constructor(
    private readonly db: PigeonDatabase,
    private readonly workspaceId: () => string
  ) {}

  snapshot(): CollectionSnapshot {
    const nodes = this.db
      .prepare('SELECT * FROM collections WHERE workspace_id = ? ORDER BY sort_order ASC, created_at ASC')
      .all(this.workspaceId()) as unknown as CollectionRow[];
    const requests = this.db
      .prepare('SELECT * FROM requests WHERE workspace_id = ? ORDER BY sort_order ASC, created_at ASC')
      .all(this.workspaceId()) as unknown as SavedRequestRow[];
    return {
      nodes: nodes.map(mapCollectionRow),
      requests: requests.map(mapRequestRow)
    };
  }

  get(id: string): CollectionNode | undefined {
    const row = this.db
      .prepare('SELECT * FROM collections WHERE id = ? AND workspace_id = ?')
      .get(id, this.workspaceId()) as CollectionRow | undefined;
    return row ? mapCollectionRow(row) : undefined;
  }

  create(input: CollectionCreateInput): CollectionNode {
    const name = input.name.trim();
    if (!name) throw new AppError('VALIDATION_ERROR', 'Collection name cannot be empty');
    if (input.type === 'folder' && input.parentId === null) {
      throw new AppError('VALIDATION_ERROR', 'Folders must be created inside a collection');
    }
    if (input.parentId) this.assertContainer(input.parentId);
    const id = randomUUID();
    const now = Date.now();
    const workspaceId = this.workspaceId();
    const order = nextSiblingOrder(this.db, workspaceId, input.parentId);
    this.db
      .prepare(
        `INSERT INTO collections (id, workspace_id, name, description, parent_id, type, pre_request_script,
          test_script, sort_order, is_dirty, created_at, updated_at)
         VALUES (?, ?, ?, '', ?, ?, '', '', ?, 1, ?, ?)`
      )
      .run(id, workspaceId, name, input.parentId, input.type, order, now, now);
    logger.info('Collection node created', { id, type: input.type, parentId: input.parentId });
    return this.get(id)!;
  }

  update(input: CollectionUpdateInput): CollectionNode {
    const existing = this.get(input.id);
    if (!existing) throw new AppError('NOT_FOUND', 'Collection was not found');
    const patch = input.patch;
    if (patch.name !== undefined && !patch.name.trim()) {
      throw new AppError('VALIDATION_ERROR', 'Collection name cannot be empty');
    }
    const now = Date.now();
    this.db
      .prepare(
        `UPDATE collections SET
          name = COALESCE(?, name),
          description = COALESCE(?, description),
          pre_request_script = COALESCE(?, pre_request_script),
          test_script = COALESCE(?, test_script),
          variables = COALESCE(?, variables),
          is_dirty = 1,
          updated_at = ?
         WHERE id = ? AND workspace_id = ?`
      )
      .run(
        patch.name?.trim() ?? null,
        patch.description ?? null,
        patch.preRequestScript ?? null,
        patch.testScript ?? null,
        patch.variables ? JSON.stringify(patch.variables) : null,
        now,
        input.id,
        this.workspaceId()
      );
    return this.get(input.id)!;
  }

  /** Returns the folder/collection variables nearest to the given node first. */
  variablesFor(id: string): VariableEntry[] {
    return this.get(id)?.variables ?? [];
  }

  /** Folder chain variables (outermost first, nearest folder wins). */
  variableScope(collectionId?: string): Record<string, string> {
    if (!collectionId) return {};
    const chain: CollectionNode[] = [];
    let current = this.get(collectionId);
    const seen = new Set<string>();
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.unshift(current);
      current = current.parentId ? this.get(current.parentId) : undefined;
    }
    const scope: Record<string, string> = {};
    for (const node of chain) Object.assign(scope, scopedVariablesToRecord(node.variables));
    return scope;
  }

  delete(id: string): void {
    if (!this.get(id)) throw new AppError('NOT_FOUND', 'Collection was not found');
    this.db.prepare('DELETE FROM collections WHERE id = ? AND workspace_id = ?').run(id, this.workspaceId());
    logger.info('Collection node deleted', { id });
  }

  move(id: string, kind: 'node' | 'request', parentId: string | null): void {
    if (kind === 'request') {
      if (!parentId) throw new AppError('VALIDATION_ERROR', 'A request must live inside a collection');
      this.assertContainer(parentId);
      const now = Date.now();
      const workspaceId = this.workspaceId();
      const result = this.db
        .prepare('UPDATE requests SET collection_id = ?, sort_order = ?, updated_at = ?, is_dirty = 1 WHERE id = ? AND workspace_id = ?')
        .run(parentId, nextSiblingOrder(this.db, workspaceId, parentId), now, id, workspaceId);
      if (Number(result.changes) === 0) throw new AppError('NOT_FOUND', 'Request was not found');
      logger.info('Request moved', { id, parentId });
      return;
    }
    const node = this.get(id);
    if (!node) throw new AppError('NOT_FOUND', 'Collection was not found');
    if (node.type === 'collection' && parentId !== null) {
      throw new AppError('VALIDATION_ERROR', 'A collection cannot be nested inside another collection');
    }
    if (node.type === 'folder' && parentId === null) {
      throw new AppError('VALIDATION_ERROR', 'A folder must live inside a collection');
    }
    if (parentId) {
      this.assertContainer(parentId);
      if (this.isDescendant(parentId, id)) {
        throw new AppError('VALIDATION_ERROR', 'A folder cannot be moved inside itself');
      }
    }
    const now = Date.now();
    const workspaceId = this.workspaceId();
    this.db
      .prepare('UPDATE collections SET parent_id = ?, sort_order = ?, updated_at = ?, is_dirty = 1 WHERE id = ? AND workspace_id = ?')
      .run(parentId, nextSiblingOrder(this.db, workspaceId, parentId), now, id, workspaceId);
    logger.info('Collection node moved', { id, parentId });
  }

  reorder(parentId: string | null, orderedIds: string[]): void {
    if (new Set(orderedIds).size !== orderedIds.length) {
      throw new AppError('VALIDATION_ERROR', 'Duplicate ids in reorder payload');
    }
    this.db.transaction(() => {
      orderedIds.forEach((id, index) => {
        const order = (index + 1) * 1000;
        const now = Date.now();
        const nodeResult = this.db
          .prepare('UPDATE collections SET sort_order = ?, updated_at = ?, is_dirty = 1 WHERE id = ? AND parent_id IS ? AND workspace_id = ?')
          .run(order, now, id, parentId, this.workspaceId());
        if (Number(nodeResult.changes) > 0) return;
        const requestResult = this.db
          .prepare('UPDATE requests SET sort_order = ?, updated_at = ?, is_dirty = 1 WHERE id = ? AND collection_id IS ? AND workspace_id = ?')
          .run(order, now, id, parentId, this.workspaceId());
        if (Number(requestResult.changes) === 0) {
          throw new AppError('VALIDATION_ERROR', `Item ${id} does not belong to this container`);
        }
      });
    });
    logger.debug('Siblings reordered', { parentId, count: orderedIds.length });
  }

  assertContainer(id: string): CollectionNode {
    const node = this.get(id);
    if (!node) throw new AppError('NOT_FOUND', 'Target collection or folder was not found');
    return node;
  }

  private isDescendant(candidateId: string, ancestorId: string): boolean {
    let current: string | null = candidateId;
    let guard = 0;
    while (current && guard < 256) {
      if (current === ancestorId) return true;
      const parent = this.db
        .prepare('SELECT parent_id FROM collections WHERE id = ? AND workspace_id = ?')
        .get(current, this.workspaceId()) as { parent_id: string | null } | undefined;
      current = parent?.parent_id ?? null;
      guard += 1;
    }
    return false;
  }

  /** Returns collection scripts from the root down to the request's parent. */
  scriptChain(parentId: string | null): CollectionNode[] {
    const chain: CollectionNode[] = [];
    let current = parentId;
    let guard = 0;
    while (current && guard < 256) {
      const node = this.get(current);
      if (!node) break;
      chain.unshift(node);
      current = node.parentId;
      guard += 1;
    }
    return chain;
  }
}

export type { SavedRequest };
