/**
 * Local database access layer. Workspaces own collections, requests,
 * environments and history.
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { DatabaseSync, type StatementSync } from 'node:sqlite';
import { defaultPreference } from '@shared/defaults';
import type { RequestBody } from '@shared/types';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('database');
const SCHEMA_VERSION = 3;

const SCHEMA_V3 = `
CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  is_active INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS collections (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  parent_id TEXT REFERENCES collections(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('collection', 'folder')),
  pre_request_script TEXT NOT NULL DEFAULT '',
  test_script TEXT NOT NULL DEFAULT '',
  variables TEXT NOT NULL DEFAULT '[]',
  sort_order REAL NOT NULL DEFAULT 0,
  cloud_id TEXT,
  sync_version INTEGER,
  is_dirty INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_collections_workspace ON collections(workspace_id, parent_id, sort_order);

CREATE TABLE IF NOT EXISTS requests (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  collection_id TEXT NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  method TEXT NOT NULL,
  url TEXT NOT NULL DEFAULT '',
  query_params TEXT NOT NULL DEFAULT '[]',
  headers TEXT NOT NULL DEFAULT '[]',
  body TEXT NOT NULL DEFAULT '{}',
  pre_request_script TEXT NOT NULL DEFAULT '',
  test_script TEXT NOT NULL DEFAULT '',
  auth TEXT NOT NULL DEFAULT '{}',
  sort_order REAL NOT NULL DEFAULT 0,
  cloud_id TEXT,
  sync_version INTEGER,
  is_dirty INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_requests_workspace ON requests(workspace_id, collection_id, sort_order);

CREATE TABLE IF NOT EXISTS environments (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  cloud_id TEXT,
  sync_version INTEGER,
  is_dirty INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_environments_workspace ON environments(workspace_id, created_at);

CREATE TABLE IF NOT EXISTS environment_variables (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  environment_id TEXT REFERENCES environments(id) ON DELETE CASCADE,
  key TEXT NOT NULL,
  value TEXT NOT NULL DEFAULT '',
  is_secret INTEGER NOT NULL DEFAULT 0,
  enabled INTEGER NOT NULL DEFAULT 1,
  sort_order REAL NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_env_vars_workspace ON environment_variables(workspace_id, environment_id, sort_order);

CREATE TABLE IF NOT EXISTS history (
  id TEXT PRIMARY KEY,
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  snapshot TEXT NOT NULL,
  response_meta TEXT NOT NULL,
  sent_at INTEGER NOT NULL,
  environment_name TEXT,
  method TEXT NOT NULL,
  url TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_history_workspace ON history(workspace_id, sent_at DESC);

CREATE TABLE IF NOT EXISTS preferences (
  id TEXT PRIMARY KEY CHECK (id = 'app'),
  value TEXT NOT NULL
);
`;

function seedFirstRun(db: DatabaseSync, workspaceId: string): void {
  const now = Date.now();
  const collectionId = randomUUID();
  const folderId = randomUUID();
  db.prepare(
    'INSERT INTO workspaces (id, name, description, is_active, created_at, updated_at) VALUES (?, ?, ?, 1, ?, ?)'
  ).run(workspaceId, 'Personal', 'My local workspace', now, now);

  const insertCollection = db.prepare(`
    INSERT INTO collections (id, workspace_id, name, description, parent_id, type, pre_request_script,
      test_script, sort_order, is_dirty, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, '', '', ?, 0, ?, ?)
  `);
  insertCollection.run(
    collectionId,
    workspaceId,
    'Pigeon Quickstart',
    'A small collection to explore Pigeon. Everything here lives on your machine.',
    null,
    'collection',
    1000,
    now,
    now
  );
  insertCollection.run(
    folderId,
    workspaceId,
    'Environment variables',
    '',
    collectionId,
    'folder',
    2000,
    now,
    now
  );

  const jsonBody: RequestBody = {
    mode: 'raw',
    raw: '{\n  "title": "Ship the release",\n  "completed": false,\n  "userId": 1\n}',
    rawLanguage: 'json',
    formdata: [],
    urlencoded: [],
    binaryFilePath: ''
  };
  const emptyBody: RequestBody = {
    mode: 'none',
    raw: '',
    rawLanguage: 'json',
    formdata: [],
    urlencoded: [],
    binaryFilePath: ''
  };
  const insertRequest = db.prepare(`
    INSERT INTO requests (id, workspace_id, collection_id, name, method, url, query_params, headers, body,
      pre_request_script, test_script, auth, sort_order, is_dirty, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `);
  insertRequest.run(
    randomUUID(),
    workspaceId,
    collectionId,
    'List todos',
    'GET',
    'https://jsonplaceholder.typicode.com/todos?_limit=5',
    JSON.stringify([{ key: '_limit', value: '5', enabled: true, description: 'Number of rows' }]),
    JSON.stringify([{ key: 'Accept', value: 'application/json', enabled: true }]),
    JSON.stringify(emptyBody),
    '',
    'pg.test("Status is 200", () => pg.response.to.have.status(200));',
    JSON.stringify({ type: 'none' }),
    1000,
    now,
    now
  );
  insertRequest.run(
    randomUUID(),
    workspaceId,
    collectionId,
    'Create a todo',
    'POST',
    'https://jsonplaceholder.typicode.com/todos',
    '[]',
    JSON.stringify([{ key: 'Content-Type', value: 'application/json', enabled: true }]),
    JSON.stringify(jsonBody),
    '',
    [
      'pg.test("Created", () => pg.response.to.have.status(201));',
      'const body = pg.response.json();',
      'pg.test("Returns an id", () => pg.expect(body).to.have.property("id"));',
      'pg.test("Echoes the title", () => pg.expect(body.title).to.equal("Ship the release"));'
    ].join('\n'),
    JSON.stringify({ type: 'none' }),
    3000,
    now,
    now
  );
  insertRequest.run(
    randomUUID(),
    workspaceId,
    folderId,
    'Use environment variables',
    'GET',
    '{{baseUrl}}/todos/1',
    '[]',
    JSON.stringify([{ key: 'Accept', value: 'application/json', enabled: true }]),
    JSON.stringify(emptyBody),
    'console.log("Resolving with environment:", pg.environment.get("baseUrl"));',
    'pg.test("Request succeeded", () => pg.response.to.have.status(200));',
    JSON.stringify({ type: 'none' }),
    1000,
    now,
    now
  );

  const environmentId = randomUUID();
  db.prepare(
    'INSERT INTO environments (id, workspace_id, name, is_active, is_dirty, created_at, updated_at) VALUES (?, ?, ?, 1, 0, ?, ?)'
  ).run(environmentId, workspaceId, 'Local', now, now);
  const insertVariable = db.prepare(`
    INSERT INTO environment_variables (id, workspace_id, environment_id, key, value, is_secret, enabled,
      sort_order, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
  `);
  insertVariable.run(randomUUID(), workspaceId, environmentId, 'baseUrl', 'https://jsonplaceholder.typicode.com', 0, 1000, now, now);
  insertVariable.run(randomUUID(), workspaceId, environmentId, 'apiToken', '', 1, 2000, now, now);
  insertVariable.run(randomUUID(), workspaceId, null, 'clientName', 'Pigeon', 0, 1000, now, now);

  db.prepare('INSERT INTO preferences (id, value) VALUES (?, ?)').run(
    'app',
    JSON.stringify(defaultPreference(''))
  );
  logger.info('Seeded first-run workspace data');
}

export class PigeonDatabase {
  readonly handle: DatabaseSync;
  readonly filePath: string;

  constructor(dataDir: string) {
    mkdirSync(dataDir, { recursive: true });
    this.filePath = path.join(dataDir, 'pigeon.db');
    this.handle = new DatabaseSync(this.filePath);
    this.handle.exec('PRAGMA journal_mode = WAL;');
    this.handle.exec('PRAGMA foreign_keys = ON;');
    this.handle.exec('PRAGMA busy_timeout = 5000;');
    this.handle.exec('PRAGMA synchronous = NORMAL;');
    this.migrate();
    logger.info('Database ready', { filePath: this.filePath, version: this.schemaVersion() });
  }

  private schemaVersion(): number {
    const row = this.handle.prepare('PRAGMA user_version').get() as { user_version?: number } | undefined;
    return row?.user_version ?? 0;
  }

  private migrate(): void {
    const version = this.schemaVersion();
    if (version === 1) {
      throw new AppError(
        'DATABASE_ERROR',
        'Unsupported database schema version 1. Delete pigeon.db to start with a fresh v0.1 database.'
      );
    }
    if (version >= SCHEMA_VERSION) return;
    this.handle.exec('BEGIN');
    try {
      if (version === 0) {
        this.handle.exec(SCHEMA_V3);
        seedFirstRun(this.handle, randomUUID());
      } else if (version === 2) {
        this.handle.exec("ALTER TABLE collections ADD COLUMN variables TEXT NOT NULL DEFAULT '[]'");
        logger.info('Migrated database to scoped variables');
      }
      this.handle.exec(`PRAGMA user_version = ${SCHEMA_VERSION}`);
      this.handle.exec('COMMIT');
    } catch (error) {
      this.handle.exec('ROLLBACK');
      throw error;
    }
  }

  prepare(sql: string): StatementSync {
    return this.handle.prepare(sql);
  }

  transaction<T>(work: () => T): T {
    this.handle.exec('BEGIN IMMEDIATE');
    try {
      const result = work();
      this.handle.exec('COMMIT');
      return result;
    } catch (error) {
      this.handle.exec('ROLLBACK');
      throw error;
    }
  }

  close(): void {
    try {
      this.handle.close();
      logger.info('Database closed');
    } catch (error) {
      logger.warn('Database close failed', { error: String(error) });
    }
  }
}

export function rows<T>(statement: StatementSync, ...params: Array<string | number | null>): T[] {
  return statement.all(...params) as unknown as T[];
}

export function row<T>(statement: StatementSync, ...params: Array<string | number | null>): T | undefined {
  return statement.get(...params) as unknown as T | undefined;
}
