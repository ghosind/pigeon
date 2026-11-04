import { randomUUID } from 'node:crypto';
import type { RequestCreateInput, RequestUpdateInput } from '@shared/ipc';
import { createEmptyAuth, createEmptyBody, createEmptyRequest } from '@shared/defaults';
import type { RequestDefinition, SavedRequest } from '@shared/types';
import type { PigeonDatabase } from '../services/database';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { nextSiblingOrder } from './ordering';
import { mapRequestRow, type SavedRequestRow } from './request.mapper';

const logger = createLogger('requests');

const REQUEST_FIELDS = [
  'name',
  'method',
  'url',
  'queryParams',
  'headers',
  'body',
  'preRequestScript',
  'testScript',
  'auth'
] as const;

export class RequestRepository {
  constructor(
    private readonly db: PigeonDatabase,
    private readonly collectionExists: (id: string) => boolean,
    private readonly workspaceId: () => string
  ) {}

  get(id: string): SavedRequest | undefined {
    const row = this.db
      .prepare('SELECT * FROM requests WHERE id = ? AND workspace_id = ?')
      .get(id, this.workspaceId()) as SavedRequestRow | undefined;
    return row ? mapRequestRow(row) : undefined;
  }

  create(input: RequestCreateInput): SavedRequest {
    if (!this.collectionExists(input.collectionId)) {
      throw new AppError('NOT_FOUND', 'The target collection does not exist');
    }
    const name = (input.name ?? input.request?.name ?? 'Untitled request').trim();
    if (!name) throw new AppError('VALIDATION_ERROR', 'Request name cannot be empty');
    const defaults = createEmptyRequest(name);
    const base = {
      ...defaults,
      ...(input.request ?? {}),
      body: { ...createEmptyBody(), ...(input.request?.body ?? {}) },
      auth: { ...createEmptyAuth(), ...(input.request?.auth ?? {}) }
    };
    const id = randomUUID();
    const now = Date.now();
    const workspaceId = this.workspaceId();
    this.db
      .prepare(
        `INSERT INTO requests (id, workspace_id, collection_id, name, method, url, query_params, headers, body,
          pre_request_script, test_script, auth, sort_order, is_dirty, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        id,
        workspaceId,
        input.collectionId,
        name,
        base.method,
        base.url,
        JSON.stringify(base.queryParams ?? []),
        JSON.stringify(base.headers ?? []),
        JSON.stringify(base.body ?? {}),
        base.preRequestScript ?? '',
        base.testScript ?? '',
        JSON.stringify(base.auth ?? { type: 'none' }),
        nextSiblingOrder(this.db, workspaceId, input.collectionId),
        now,
        now
      );
    logger.info('Request created', { id, collectionId: input.collectionId });
    return this.get(id)!;
  }

  update(input: RequestUpdateInput): SavedRequest {
    const existing = this.get(input.id);
    if (!existing) throw new AppError('NOT_FOUND', 'Request was not found');
    const patch = input.patch;
    if (patch.name !== undefined && !patch.name.trim()) {
      throw new AppError('VALIDATION_ERROR', 'Request name cannot be empty');
    }
    const values: Record<(typeof REQUEST_FIELDS)[number], string> = {
      name: patch.name?.trim() ?? existing.name,
      method: patch.method ?? existing.method,
      url: patch.url ?? existing.url,
      queryParams: JSON.stringify(patch.queryParams ?? existing.queryParams),
      headers: JSON.stringify(patch.headers ?? existing.headers),
      body: JSON.stringify(patch.body ?? existing.body),
      preRequestScript: patch.preRequestScript ?? existing.preRequestScript,
      testScript: patch.testScript ?? existing.testScript,
      auth: JSON.stringify(patch.auth ?? existing.auth)
    };
    this.db
      .prepare(
        `UPDATE requests SET name = ?, method = ?, url = ?, query_params = ?, headers = ?, body = ?,
          pre_request_script = ?, test_script = ?, auth = ?, is_dirty = 1, updated_at = ?
         WHERE id = ? AND workspace_id = ?`
      )
      .run(
        values.name,
        values.method,
        values.url,
        values.queryParams,
        values.headers,
        values.body,
        values.preRequestScript,
        values.testScript,
        values.auth,
        Date.now(),
        input.id,
        this.workspaceId()
      );
    logger.debug('Request updated', { id: input.id, fields: Object.keys(patch) });
    return this.get(input.id)!;
  }

  delete(id: string): void {
    if (!this.get(id)) throw new AppError('NOT_FOUND', 'Request was not found');
    this.db.prepare('DELETE FROM requests WHERE id = ? AND workspace_id = ?').run(id, this.workspaceId());
    logger.info('Request deleted', { id });
  }

  duplicate(id: string): SavedRequest {
    const source = this.get(id);
    if (!source) throw new AppError('NOT_FOUND', 'Request was not found');
    const name = `${source.name} copy`;
    const newId = randomUUID();
    const now = Date.now();
    const workspaceId = this.workspaceId();
    this.db
      .prepare(
        `INSERT INTO requests (id, workspace_id, collection_id, name, method, url, query_params, headers, body,
          pre_request_script, test_script, auth, sort_order, is_dirty, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?)`
      )
      .run(
        newId,
        workspaceId,
        source.collectionId,
        name,
        source.method,
        source.url,
        JSON.stringify(source.queryParams),
        JSON.stringify(source.headers),
        JSON.stringify(source.body),
        source.preRequestScript,
        source.testScript,
        JSON.stringify(source.auth),
        nextSiblingOrder(this.db, workspaceId, source.collectionId),
        now,
        now
      );
    logger.info('Request duplicated', { sourceId: id, id: newId });
    return this.get(newId)!;
  }

  /** Creates a request inside a collection, used by importers and "save to collection". */
  insertDefinition(collectionId: string, definition: RequestDefinition, order: number): SavedRequest {
    const created = this.create({ collectionId, request: definition });
    this.db.prepare('UPDATE requests SET sort_order = ? WHERE id = ? AND workspace_id = ?').run(order, created.id, this.workspaceId());
    return this.get(created.id)!;
  }
}
