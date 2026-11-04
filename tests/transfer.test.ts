import { describe, expect, it } from 'vitest';
import { createEmptyRequest, defaultPreference } from '@shared/defaults';
import type { CollectionCreateInput, CollectionUpdateInput } from '@shared/ipc';
import type {
  AppPreference,
  CollectionNode,
  CollectionSnapshot,
  RequestDefinition,
  SavedRequest
} from '@shared/types';
import type { CollectionRepository } from '../src/main/repositories/collection.repository';
import type { EnvironmentRepository } from '../src/main/repositories/environment.repository';
import type { PreferenceRepository } from '../src/main/repositories/preference.repository';
import type { RequestRepository } from '../src/main/repositories/request.repository';
import {
  BackupService,
  type BackupCollectionRow,
  type BackupRequestRow,
  type BackupVariableRow,
  type PigeonBackup
} from '../src/main/services/transfer/backup.service';
import { HarExporter } from '../src/main/services/transfer/har-export';
import { HarImporter, parseHar } from '../src/main/services/transfer/har-import';
import {
  POSTMAN_SCHEMA,
  PostmanExporter,
  type PostmanCollectionFile
} from '../src/main/services/transfer/postman-export';
import {
  PostmanImporter,
  parsePostmanCollection,
  parsePostmanEnvironment
} from '../src/main/services/transfer/postman-import';
import type { PigeonDatabase } from '../src/main/services/database';
import { AppError } from '../src/main/utils/errors';

class FakeRequests {
  readonly rows: SavedRequest[] = [];
  private counter = 0;

  insertDefinition(collectionId: string, definition: RequestDefinition, order: number): SavedRequest {
    const row: SavedRequest = {
      ...definition,
      id: `req-${++this.counter}`,
      collectionId,
      order,
      isDirty: false,
      createdAt: 1000,
      updatedAt: 1000
    };
    this.rows.push(row);
    return row;
  }

  add(row: SavedRequest): SavedRequest {
    this.rows.push(row);
    return row;
  }

  get(id: string): SavedRequest | undefined {
    return this.rows.find((row) => row.id === id);
  }
}

class FakeCollections {
  readonly nodes: CollectionNode[] = [];
  readonly updates: CollectionUpdateInput[] = [];
  private counter = 0;

  constructor(private readonly requestStore: FakeRequests) {}

  create(input: CollectionCreateInput): CollectionNode {
    const node: CollectionNode = {
      id: `node-${++this.counter}`,
      name: input.name,
      description: '',
      parentId: input.parentId,
      type: input.type,
      preRequestScript: '',
      testScript: '',
      order: this.nextOrder(input.parentId),
      isDirty: false,
      createdAt: 1000,
      updatedAt: 1000
    };
    this.nodes.push(node);
    return node;
  }

  update(input: CollectionUpdateInput): CollectionNode {
    this.updates.push(input);
    const node = this.nodes.find((candidate) => candidate.id === input.id);
    if (!node) throw new Error(`Missing fake node ${input.id}`);
    Object.assign(node, input.patch);
    return node;
  }

  add(node: CollectionNode): CollectionNode {
    this.nodes.push(node);
    return node;
  }

  get(id: string): CollectionNode | undefined {
    return this.nodes.find((node) => node.id === id);
  }

  snapshot(): CollectionSnapshot {
    return { nodes: [...this.nodes], requests: [...this.requestStore.rows] };
  }

  private nextOrder(parentId: string | null): number {
    const values = [
      ...this.nodes.filter((node) => node.parentId === parentId).map((node) => node.order),
      ...this.requestStore.rows
        .filter((row) => row.collectionId === parentId)
        .map((row) => row.order)
    ];
    return (values.length > 0 ? Math.max(...values) : 0) + 1000;
  }
}

function collectionNode(
  id: string,
  name: string,
  type: 'collection' | 'folder',
  parentId: string | null,
  order: number,
  overrides: Partial<CollectionNode> = {}
): CollectionNode {
  return {
    id,
    name,
    description: '',
    parentId,
    type,
    preRequestScript: '',
    testScript: '',
    order,
    isDirty: false,
    createdAt: 1000,
    updatedAt: 1000,
    ...overrides
  };
}

function savedRequest(
  id: string,
  collectionId: string,
  order: number,
  definition: RequestDefinition
): SavedRequest {
  return { ...definition, id, collectionId, order, isDirty: false, createdAt: 1000, updatedAt: 1000 };
}

const sampleCollection = {
  info: {
    name: 'Demo API',
    description: 'A demo collection',
    schema: POSTMAN_SCHEMA
  },
  event: [{ listen: 'prerequest', script: { type: 'text/javascript', exec: ['console.log("root");'] } }],
  item: [
    {
      name: 'Create user',
      request: {
        method: 'POST',
        header: [
          { key: 'Content-Type', value: 'application/json' },
          { key: 'X-Debug', value: '1', disabled: true }
        ],
        body: { mode: 'raw', raw: '{"name":"Ada"}', options: { raw: { language: 'json' } } },
        url: {
          raw: 'https://api.example.com/users?active=true&limit=10',
          protocol: 'https',
          host: ['api', 'example', 'com'],
          path: ['users'],
          query: [
            { key: 'active', value: 'true' },
            { key: 'limit', value: '10', description: 'Page size' }
          ]
        },
        auth: { type: 'bearer', bearer: [{ key: 'token', value: '{{token}}' }] }
      },
      event: [
        { listen: 'prerequest', script: { exec: ['const a = 1;', 'console.log(a);'] } },
        { listen: 'test', script: { exec: ['pm.test("ok", () => {});'] } }
      ]
    },
    {
      name: 'Admin',
      description: 'Admin calls',
      item: [
        {
          name: 'List users',
          request: {
            method: 'GET',
            url: 'https://api.example.com/users?limit=5',
            header: [],
            auth: { type: 'inherit' }
          }
        },
        {
          name: 'GraphQL query',
          request: {
            method: 'POST',
            url: 'https://api.example.com/graphql',
            body: { mode: 'graphql', graphql: { query: '{ users { id } }', variables: '{"limit":5}' } }
          }
        }
      ]
    }
  ]
};

describe('Postman parsing', () => {
  it('maps nested folders, requests, bodies, auth and scripts', () => {
    const parsed = parsePostmanCollection(sampleCollection);
    expect(parsed.name).toBe('Demo API');
    expect(parsed.description).toBe('A demo collection');
    expect(parsed.preRequestScript).toContain('root');
    expect(parsed.counts).toEqual({ folders: 1, requests: 3, skipped: 0 });

    const first = parsed.nodes[0];
    expect(first.kind).toBe('request');
    if (first.kind !== 'request') throw new Error('expected request');
    expect(first.request.method).toBe('POST');
    expect(first.request.url).toBe('https://api.example.com/users');
    expect(first.request.queryParams.map((param) => param.key)).toEqual(['active', 'limit']);
    expect(first.request.queryParams[1].description).toBe('Page size');
    expect(first.request.headers[1]).toMatchObject({ key: 'X-Debug', enabled: false });
    expect(first.request.body).toMatchObject({
      mode: 'raw',
      raw: '{"name":"Ada"}',
      rawLanguage: 'json'
    });
    expect(first.request.auth).toMatchObject({ type: 'bearer', bearer: { token: '{{token}}' } });
    expect(first.request.preRequestScript).toBe('const a = 1;\nconsole.log(a);');
    expect(first.request.testScript).toBe('pm.test("ok", () => {});');

    const folder = parsed.nodes[1];
    expect(folder.kind).toBe('folder');
    if (folder.kind !== 'folder') throw new Error('expected folder');
    expect(folder.description).toBe('Admin calls');
    expect(folder.items).toHaveLength(2);
    const graphql = folder.items[1];
    expect(graphql.kind).toBe('request');
    if (graphql.kind !== 'request') throw new Error('expected request');
    expect(JSON.parse(graphql.request.body.raw ?? '')).toEqual({
      query: '{ users { id } }',
      variables: { limit: 5 }
    });
    const inherited = folder.items[0];
    if (inherited.kind !== 'request') throw new Error('expected request');
    expect(inherited.request.auth.type).toBe('none');
  });

  it('maps urlencoded, formdata, file bodies and additional auth types', () => {
    const parsed = parsePostmanCollection({
      item: [
        {
          name: 'Form',
          request: {
            method: 'POST',
            url: 'https://x.dev/form',
            auth: {
              type: 'basic',
              basic: [
                { key: 'username', value: 'ada' },
                { key: 'password', value: 'secret' }
              ]
            },
            body: {
              mode: 'urlencoded',
              urlencoded: [{ key: 'a', value: '1', disabled: true }]
            }
          }
        },
        {
          name: 'Upload',
          request: {
            method: 'POST',
            url: 'https://x.dev/upload',
            auth: { type: 'apikey', apikey: [{ key: 'key', value: 'X-Key' }, { key: 'value', value: 'v' }] },
            body: {
              mode: 'formdata',
              formdata: [
                { key: 'file', type: 'file', src: '/tmp/a.txt' },
                { key: 'note', value: 'hi', type: 'text' }
              ]
            }
          }
        },
        {
          name: 'Binary',
          request: {
            method: 'POST',
            url: 'https://x.dev/binary',
            body: { mode: 'file', file: { src: '/tmp/blob.bin' } }
          }
        },
        {
          name: 'OAuth',
          request: { method: 'GET', url: 'https://x.dev/oauth', auth: { type: 'oauth2' }, body: { mode: 'weird' } }
        }
      ]
    });

    const [form, upload, binary, oauth] = parsed.nodes;
    if (form.kind !== 'request' || upload.kind !== 'request' || binary.kind !== 'request' || oauth.kind !== 'request') {
      throw new Error('expected requests');
    }
    expect(form.request.body.mode).toBe('urlencoded');
    expect(form.request.body.urlencoded?.[0]).toMatchObject({ key: 'a', value: '1', enabled: false });
    expect(form.request.auth).toMatchObject({ type: 'basic', basic: { username: 'ada', password: 'secret' } });
    expect(upload.request.body.formdata?.[0]).toMatchObject({ key: 'file', type: 'file', filePath: '/tmp/a.txt' });
    expect(upload.request.auth).toMatchObject({ type: 'apikey', apikey: { key: 'X-Key', value: 'v', in: 'header' } });
    expect(binary.request.body).toMatchObject({ mode: 'binary', binaryFilePath: '/tmp/blob.bin' });
    expect(oauth.request.auth.type).toBe('none');
    expect(parsed.warnings.join(' ')).toContain('oauth2');
    expect(parsed.warnings.join(' ')).toContain('weird');
  });

  it('guards the item limit and skips malformed entries', () => {
    const items = Array.from({ length: 5001 }, (_, index) => ({
      name: `Request ${index}`,
      request: { method: 'GET', url: `https://example.com/${index}` }
    }));
    const parsed = parsePostmanCollection({ info: { name: 'Large' }, item: items });
    expect(parsed.counts.requests).toBe(5000);
    expect(parsed.warnings.join(' ')).toContain('more than 5000 items');

    const withJunk = parsePostmanCollection({ item: [null, { name: 'Nothing' }] });
    expect(withJunk.counts).toEqual({ folders: 0, requests: 0, skipped: 2 });
    expect(withJunk.warnings.length).toBeGreaterThan(0);
  });

  it('rejects invalid documents', () => {
    expect(() => parsePostmanCollection('no json here')).toThrow(AppError);
    expect(() => parsePostmanCollection({ info: { name: 'x' } })).toThrow(AppError);
  });

  it('parses environments including secret variables', () => {
    const parsed = parsePostmanEnvironment({
      name: 'Staging',
      values: [
        { key: 'baseUrl', value: 'https://staging.example.com', type: 'default', enabled: true },
        { key: 'token', value: 'shh', type: 'secret', enabled: false },
        { key: '', value: 'ignored' }
      ]
    });
    expect(parsed.name).toBe('Staging');
    expect(parsed.variables).toEqual([
      { key: 'baseUrl', value: 'https://staging.example.com', secret: false, enabled: true },
      { key: 'token', value: 'shh', secret: true, enabled: false }
    ]);
  });
});

describe('Postman import and export', () => {
  it('persists a parsed collection through the repositories', () => {
    const requests = new FakeRequests();
    const collections = new FakeCollections(requests);
    const result = new PostmanImporter(collections, requests).import(sampleCollection);

    expect(result.summary).toEqual({
      collections: 1,
      folders: 1,
      requests: 3,
      environments: 0,
      skipped: 0,
      warnings: []
    });
    expect(result.importedCollectionIds).toHaveLength(1);
    const root = collections.nodes[0];
    expect(root).toMatchObject({ name: 'Demo API', type: 'collection', parentId: null });
    expect(root.description).toBe('A demo collection');
    expect(root.preRequestScript).toContain('root');

    const folder = collections.nodes.find((node) => node.type === 'folder');
    expect(folder?.parentId).toBe(root.id);
    expect(folder?.description).toBe('Admin calls');
    expect(requests.rows).toHaveLength(3);
    expect(requests.rows.filter((row) => row.collectionId === root.id).map((row) => row.order)).toEqual([
      1000
    ]);
    expect(requests.rows.filter((row) => row.collectionId === folder?.id)).toHaveLength(2);
  });

  it('builds Postman v2.1 output that parses back', () => {
    const requests = new FakeRequests();
    const collections = new FakeCollections(requests);
    collections.add(
      collectionNode('c1', 'Demo API', 'collection', null, 1000, {
        description: 'Collection description',
        preRequestScript: 'console.log("pre");',
        testScript: 'pm.test("root", () => {});'
      })
    );
    collections.add(collectionNode('f1', 'Admin', 'folder', 'c1', 2000, { description: 'Admin calls' }));
    requests.add(
      savedRequest('r1', 'c1', 1000, {
        ...createEmptyRequest('List users'),
        url: 'https://api.example.com/users',
        queryParams: [{ key: 'limit', value: '5', enabled: true, description: 'Rows' }],
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }],
        testScript: 'pm.test("ok", () => {});',
        auth: { type: 'bearer', bearer: { token: '{{token}}' } }
      })
    );
    requests.add(
      savedRequest('r2', 'f1', 1000, {
        ...createEmptyRequest('Create user'),
        method: 'POST',
        url: 'https://api.example.com/users',
        body: {
          mode: 'urlencoded',
          raw: '',
          rawLanguage: 'json',
          urlencoded: [{ key: 'name', value: 'Ada', enabled: true }],
          formdata: [],
          binaryFilePath: ''
        }
      })
    );

    const file = new PostmanExporter(collections, requests).build('c1');
    expect(file.info.schema).toBe(POSTMAN_SCHEMA);
    expect(file.info).toMatchObject({ name: 'Demo API', description: 'Collection description' });
    expect(file.item).toHaveLength(2);
    expect(file.event?.[0].listen).toBe('prerequest');
    expect(file.item[0].request?.url).toEqual({
      raw: 'https://api.example.com/users?limit=5',
      query: [{ key: 'limit', value: '5', description: 'Rows' }]
    });
    expect(file.item[0].request?.auth).toMatchObject({ type: 'bearer' });
    expect(file.item[0].event?.[0].listen).toBe('test');
    expect(file.item[1].description).toBe('Admin calls');
    expect(file.item[1].item?.[0].request?.body).toMatchObject({ mode: 'urlencoded' });

    const reparsed = parsePostmanCollection(JSON.parse(JSON.stringify(file)) as PostmanCollectionFile);
    expect(reparsed.name).toBe('Demo API');
    expect(reparsed.counts).toEqual({ folders: 1, requests: 2, skipped: 0 });
    const parsedFirst = reparsed.nodes[0];
    if (parsedFirst.kind !== 'request') throw new Error('expected request');
    expect(parsedFirst.request.queryParams[0]).toMatchObject({ key: 'limit', value: '5', enabled: true });
  });
});

describe('HAR parsing, import and export', () => {
  const har = {
    log: {
      version: '1.2',
      creator: { name: 'Test Browser', version: '1.0' },
      pages: [{ title: 'Network capture' }],
      entries: [
        {
          startedDateTime: '2024-01-01T00:00:00.000Z',
          request: {
            method: 'GET',
            url: 'https://api.example.com/items?page=2&limit=10',
            httpVersion: 'HTTP/1.1',
            headers: [{ name: 'Accept', value: 'application/json' }],
            queryString: [
              { name: 'page', value: '2' },
              { name: 'limit', value: '10' }
            ]
          }
        },
        {
          request: {
            method: 'POST',
            url: 'https://api.example.com/items',
            headers: [],
            queryString: [],
            postData: {
              mimeType: 'application/x-www-form-urlencoded',
              params: [
                { name: 'title', value: 'Hello' },
                { name: 'done', value: 'false' }
              ]
            }
          }
        },
        {
          request: {
            method: 'POST',
            url: 'https://api.example.com/json',
            headers: [],
            queryString: [],
            postData: { mimeType: 'application/json', text: '{"a":1}' }
          }
        },
        { request: {} }
      ]
    }
  };

  it('maps query strings, headers, bodies and skips bad entries', () => {
    const parsed = parseHar(har, 'fallback');
    expect(parsed.name).toBe('Network capture');
    expect(parsed.requests).toHaveLength(3);
    expect(parsed.skipped).toBe(1);
    expect(parsed.warnings.join(' ')).toContain('Skipped 1');

    const [getRequest, formRequest, jsonRequest] = parsed.requests;
    expect(getRequest.method).toBe('GET');
    expect(getRequest.url).toBe('https://api.example.com/items');
    expect(getRequest.queryParams.map((param) => param.value)).toEqual(['2', '10']);
    expect(getRequest.headers[0]).toMatchObject({ key: 'Accept', value: 'application/json' });
    expect(getRequest.name).toContain('/items');
    expect(formRequest.body.mode).toBe('urlencoded');
    expect(formRequest.body.urlencoded?.map((param) => param.key)).toEqual(['title', 'done']);
    expect(jsonRequest.body).toMatchObject({ mode: 'raw', raw: '{"a":1}', rawLanguage: 'json' });
  });

  it('imports HAR entries into one collection', () => {
    const requests = new FakeRequests();
    const collections = new FakeCollections(requests);
    const result = new HarImporter(collections, requests).import(har, 'fallback');
    expect(result.summary).toMatchObject({ collections: 1, requests: 3, skipped: 1 });
    expect(collections.nodes[0]).toMatchObject({ name: 'Network capture', type: 'collection' });
    expect(requests.rows.map((row) => row.order)).toEqual([1000, 2000, 3000]);
  });

  it('exports HAR 1.2 entries', () => {
    const requests = new FakeRequests();
    const collections = new FakeCollections(requests);
    collections.add(collectionNode('c1', 'Demo', 'collection', null, 1000));
    requests.add(
      savedRequest('r1', 'c1', 1000, {
        ...createEmptyRequest('Get items'),
        url: 'https://api.example.com/items',
        queryParams: [{ key: 'limit', value: '5', enabled: true }],
        headers: [{ key: 'Accept', value: 'application/json', enabled: true }]
      })
    );
    requests.add(
      savedRequest('r2', 'c1', 2000, {
        ...createEmptyRequest('Create item'),
        method: 'POST',
        url: 'https://api.example.com/items',
        body: {
          mode: 'urlencoded',
          raw: '',
          rawLanguage: 'json',
          urlencoded: [{ key: 'title', value: 'Hello World', enabled: true }],
          formdata: [],
          binaryFilePath: ''
        }
      })
    );

    const file = new HarExporter(collections, requests).build('c1');
    expect(file.log.version).toBe('1.2');
    expect(file.log.creator.name).toBe('Pigeon');
    expect(file.log.entries).toHaveLength(2);
    const [getEntry, postEntry] = file.log.entries;
    expect(getEntry.request.url).toBe('https://api.example.com/items?limit=5');
    expect(getEntry.request.queryString).toEqual([{ name: 'limit', value: '5' }]);
    expect(getEntry.request.headers).toEqual([{ name: 'Accept', value: 'application/json' }]);
    expect(postEntry.request.postData).toMatchObject({
      mimeType: 'application/x-www-form-urlencoded',
      text: 'title=Hello%20World'
    });
    expect(postEntry.response.status).toBe(0);
    expect(() => new HarExporter(collections, requests).build('missing')).toThrow(AppError);
  });
});

interface FakeStatement {
  run(...params: unknown[]): { changes: number };
  all(): unknown[];
  get(): unknown;
}

function fakeDatabase(): { db: PigeonDatabase; calls: Array<{ sql: string; params: unknown[] }> } {
  const calls: Array<{ sql: string; params: unknown[] }> = [];
  const prepare = (sql: string): FakeStatement => ({
    run: (...params: unknown[]) => {
      calls.push({ sql, params });
      return { changes: 1 };
    },
    all: () => [],
    get: () => undefined
  });
  const db = { prepare, transaction: <T>(work: () => T): T => work() };
  return { db: db as unknown as PigeonDatabase, calls };
}

function backupRow(overrides: Partial<BackupCollectionRow> = {}): BackupCollectionRow {
  return {
    id: 'c1',
    name: 'Root',
    description: '',
    parent_id: null,
    type: 'collection',
    pre_request_script: '',
    test_script: '',
    sort_order: 1000,
    cloud_id: null,
    sync_version: null,
    is_dirty: 0,
    created_at: 1000,
    updated_at: 1000,
    ...overrides
  };
}

function requestRow(overrides: Partial<BackupRequestRow> = {}): BackupRequestRow {
  return {
    id: 'r1',
    collection_id: 'c1',
    name: 'Request',
    method: 'GET',
    url: 'https://example.com',
    query_params: '[]',
    headers: '[]',
    body: '{}',
    pre_request_script: '',
    test_script: '',
    auth: '{}',
    sort_order: 1000,
    cloud_id: null,
    sync_version: null,
    is_dirty: 0,
    created_at: 1000,
    updated_at: 1000,
    ...overrides
  };
}

function variableRow(overrides: Partial<BackupVariableRow> = {}): BackupVariableRow {
  return {
    id: 'v1',
    environment_id: 'e1',
    key: 'token',
    value: 'enc:v1:abc',
    is_secret: 1,
    enabled: 1,
    sort_order: 1000,
    created_at: 1000,
    updated_at: 1000,
    ...overrides
  };
}

function sampleBackup(): PigeonBackup {
  return {
    format: 'pigeon-backup',
    version: 1,
    exportedAt: '2024-01-01T00:00:00.000Z',
    collections: [
      backupRow(),
      backupRow({ id: 'f1', name: 'Folder', parent_id: 'c1', type: 'folder', sort_order: 2000 })
    ],
    requests: [requestRow({ collection_id: 'f1' })],
    environments: [
      {
        id: 'e1',
        name: 'Local',
        is_active: 1,
        cloud_id: null,
        sync_version: null,
        is_dirty: 0,
        created_at: 1000,
        updated_at: 1000,
        variables: [variableRow()]
      }
    ],
    globals: [variableRow({ id: 'g1', environment_id: null, key: 'host', value: 'example.com', is_secret: 0 })],
    preferences: null
  };
}

describe('BackupService', () => {
  const preferences = {
    get: () => {
      throw new Error('preferences must not be touched by validation');
    },
    save: () => {
      throw new Error('preferences must not be touched by validation');
    }
  } as unknown as PreferenceRepository;

  function serviceWith(db: PigeonDatabase): BackupService {
    return new BackupService(
      db,
      {} as CollectionRepository,
      {} as RequestRepository,
      {} as EnvironmentRepository,
      preferences
    );
  }

  it('validates format and version before touching the database', () => {
    const db = {
      prepare: () => {
        throw new Error('database must not be touched');
      },
      transaction: () => {
        throw new Error('database must not be touched');
      }
    } as unknown as PigeonDatabase;
    const service = serviceWith(db);

    try {
      service.restoreBackup({ format: 'something-else', version: 1 });
      throw new Error('expected restore to throw');
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe('VALIDATION_ERROR');
    }
    expect(() => service.restoreBackup({ format: 'pigeon-backup', version: 2 })).toThrow(/version/i);
    expect(() => service.restoreBackup({ format: 'other-backup', version: 1 })).toThrow(/Pigeon backup/i);
  });

  it('restores parents before children and keeps encrypted values', () => {
    const { db, calls } = fakeDatabase();
    const result = serviceWith(db).restoreBackup(sampleBackup());

    expect(result.summary).toEqual({
      collections: 1,
      folders: 1,
      requests: 1,
      environments: 1,
      skipped: 0,
      warnings: []
    });
    expect(result.importedCollectionIds).toEqual(['c1']);

    const firstInsert = calls.findIndex((call) => call.sql.startsWith('INSERT'));
    expect(firstInsert).toBeGreaterThan(0);
    expect(calls.slice(0, firstInsert).every((call) => call.sql.startsWith('DELETE'))).toBe(true);

    const collectionIds = calls
      .filter((call) => call.sql.startsWith('INSERT INTO collections'))
      .map((call) => call.params[0]);
    expect(collectionIds).toEqual(['c1', 'f1']);

    const requestIndex = calls.findIndex((call) => call.sql.startsWith('INSERT INTO requests'));
    const lastCollectionIndex = calls.reduce(
      (latest, call, index) => (call.sql.startsWith('INSERT INTO collections') ? index : latest),
      -1
    );
    expect(requestIndex).toBeGreaterThan(lastCollectionIndex);
    expect(calls[requestIndex].params[1]).toBe('f1');

    const environmentIndex = calls.findIndex((call) => call.sql.startsWith('INSERT INTO environments'));
    const variableCalls = calls.filter((call) => call.sql.startsWith('INSERT INTO environment_variables'));
    expect(environmentIndex).toBeGreaterThan(-1);
    expect(environmentIndex).toBeLessThan(calls.indexOf(variableCalls[0]));
    expect(variableCalls.map((call) => call.params[3])).toEqual(['enc:v1:abc', 'example.com']);
    expect(variableCalls[1].params[1]).toBeNull();
  });

  it('restores preferences without changing the active data directory', () => {
    const { db } = fakeDatabase();
    const saved: AppPreference[] = [];
    const preferences = {
      get: () => ({ ...defaultPreference('/current'), theme: 'dark' }),
      save: (value: AppPreference) => {
        saved.push(value);
        return value;
      }
    } as unknown as PreferenceRepository;
    const service = new BackupService(
      db,
      {} as CollectionRepository,
      {} as RequestRepository,
      {} as EnvironmentRepository,
      preferences
    );
    const backup = sampleBackup();
    backup.preferences = { theme: 'light', dataDir: '/other/place' } as unknown as AppPreference;
    service.restoreBackup(backup);
    expect(saved).toHaveLength(1);
    expect(saved[0]).toMatchObject({ theme: 'light', dataDir: '/current' });
  });

  it('drops orphaned requests and reparents missing nodes', () => {
    const { db } = fakeDatabase();
    const backup = sampleBackup();
    backup.collections = [backupRow({ parent_id: 'missing' })];
    backup.requests = [requestRow({ collection_id: 'missing' })];
    const result = serviceWith(db).restoreBackup(backup);
    expect(result.summary.requests).toBe(0);
    expect(result.summary.skipped).toBe(1);
    expect(result.summary.warnings.join(' ')).toContain('missing parent');
  });
});
