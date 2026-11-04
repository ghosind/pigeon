import { randomUUID } from 'node:crypto';
import type { HistoryPage, HistoryQuery, HistoryRecord, HttpMethod, RequestDefinition, ResponseMeta } from '@shared/types';
import type { PigeonDatabase } from '../services/database';
import { createLogger } from '../utils/logger';
import { createEmptyRequest } from '@shared/defaults';

const logger = createLogger('history');

interface HistoryRow {
  id: string;
  workspace_id: string;
  snapshot: string;
  response_meta: string;
  sent_at: number;
  environment_name: string | null;
  method: string;
  url: string;
}

function safeParse<T>(value: string, fallback: T): T {
  try {
    return JSON.parse(value) as T;
  } catch {
    return fallback;
  }
}

function mapRow(row: HistoryRow): HistoryRecord {
  const snapshot = safeParse<RequestDefinition>(row.snapshot, createEmptyRequest());
  const meta = safeParse<ResponseMeta>(row.response_meta, {
    status: 0,
    statusText: '',
    duration: 0,
    size: 0,
    responseHeaders: {},
    receivedAt: row.sent_at,
    contentType: ''
  });
  return {
    id: row.id,
    snapshot,
    responseMeta: meta,
    sentAt: row.sent_at,
    environmentName: row.environment_name ?? undefined,
    method: row.method as HttpMethod,
    url: row.url
  };
}

export class HistoryRepository {
  constructor(
    private readonly db: PigeonDatabase,
    private readonly workspaceId: () => string
  ) {}

  add(
    snapshot: RequestDefinition,
    responseMeta: ResponseMeta,
    environmentName: string,
    limit: number
  ): HistoryRecord {
    const id = randomUUID();
    const sentAt = Date.now();
    this.db.transaction(() => {
      this.db
        .prepare(
          'INSERT INTO history (id, workspace_id, snapshot, response_meta, sent_at, environment_name, method, url) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
        )
        .run(
          id,
          this.workspaceId(),
          JSON.stringify(snapshot),
          JSON.stringify(responseMeta),
          sentAt,
          environmentName,
          snapshot.method,
          snapshot.url
        );
      this.db
        .prepare(
          'DELETE FROM history WHERE workspace_id = ? AND id NOT IN (SELECT id FROM history WHERE workspace_id = ? ORDER BY sent_at DESC LIMIT ?)'
        )
        .run(this.workspaceId(), this.workspaceId(), Math.max(10, limit));
    });
    logger.info('History recorded', { id, status: responseMeta.status, method: snapshot.method });
    const row = this.db.prepare('SELECT * FROM history WHERE id = ?').get(id) as unknown as HistoryRow;
    return mapRow(row);
  }

  list(query: HistoryQuery): HistoryPage {
    const limit = Math.min(Math.max(query.limit ?? 50, 1), 200);
    const offset = Math.max(query.offset ?? 0, 0);
    const search = query.search?.trim();
    const clauses = ['workspace_id = ?'];
    const params: Array<string | number> = [this.workspaceId()];
    if (search) {
      clauses.push('(url LIKE ? OR snapshot LIKE ? OR method LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }
    const where = `WHERE ${clauses.join(' AND ')}`;
    const totalRow = this.db
      .prepare(`SELECT COUNT(*) AS count FROM history ${where}`)
      .get(...params) as { count: number } | undefined;
    const rows = this.db
      .prepare(`SELECT * FROM history ${where} ORDER BY sent_at DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as unknown as HistoryRow[];
    return { items: rows.map(mapRow), total: totalRow?.count ?? 0 };
  }

  delete(id: string): void {
    this.db.prepare('DELETE FROM history WHERE id = ? AND workspace_id = ?').run(id, this.workspaceId());
    logger.info('History entry deleted', { id });
  }

  clear(): void {
    this.db.prepare('DELETE FROM history WHERE workspace_id = ?').run(this.workspaceId());
    logger.info('History cleared');
  }

  allForExport(): HistoryRecord[] {
    const rows = this.db
      .prepare('SELECT * FROM history WHERE workspace_id = ? ORDER BY sent_at DESC')
      .all(this.workspaceId()) as unknown as HistoryRow[];
    return rows.map(mapRow);
  }
}
