import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import http, { type Server } from 'node:http';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { defaultPreference } from '@shared/defaults';
import type { RequestDefinition } from '@shared/types';
import { PigeonDatabase } from '../src/main/services/database';
import { CryptoService } from '../src/main/services/crypto.service';
import { CollectionRepository } from '../src/main/repositories/collection.repository';
import { RequestRepository } from '../src/main/repositories/request.repository';
import { EnvironmentRepository } from '../src/main/repositories/environment.repository';
import { HistoryRepository } from '../src/main/repositories/history.repository';
import { PreferenceRepository } from '../src/main/repositories/preference.repository';
import { WorkspaceRepository } from '../src/main/repositories/workspace.repository';
import { BodyStore } from '../src/main/services/body-store';
import { ScriptRunner } from '../src/main/services/script-runner';
import { ProxyService } from '../src/main/services/proxy.service';
import { SslService } from '../src/main/services/ssl.service';
import { RequestEngine } from '../src/main/services/request-engine';

let server: Server;
let baseUrl = '';
const dirs: string[] = [];

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => {
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Server': 'pigeon-test' });
      res.end(
        JSON.stringify({
          method: req.method,
          url: req.url,
          authorization: req.headers.authorization,
          pre: req.headers['x-pre'],
          collection: req.headers['x-collection'],
          body: Buffer.concat(chunks).toString()
        })
      );
    });
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No address');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

function definition(overrides: Partial<RequestDefinition> = {}): RequestDefinition {
  return {
    name: 'Engine test',
    method: 'POST',
    url: `${baseUrl}/echo?x=1`,
    queryParams: [],
    headers: [{ key: 'X-Custom', value: 'yes', enabled: true }],
    body: { mode: 'raw', raw: '{"hello":"world"}', rawLanguage: 'json', formdata: [], urlencoded: [], binaryFilePath: '' },
    preRequestScript: 'pg.environment.set("marker", "ran"); pg.request.headers.upsert({ key: "X-Pre", value: "1" });',
    testScript: 'pg.test("status ok", () => pg.response.to.have.status(200)); pg.test("json", () => pg.expect(pg.response.json()).to.have.property("pre"));',
    auth: { type: 'bearer', bearer: { token: '{{token}}' } },
    ...overrides
  };
}

function createEngine() {
  const dir = mkdtempSync(path.join(tmpdir(), 'pigeon-engine-'));
  dirs.push(dir);
  const db = new PigeonDatabase(dir);
  const crypto = new CryptoService(dir);
  const workspaces = new WorkspaceRepository(db);
  const workspaceId = (): string => workspaces.activeId();
  const collections = new CollectionRepository(db, workspaceId);
  const requests = new RequestRepository(db, (id) => Boolean(collections.get(id)), workspaceId);
  const environments = new EnvironmentRepository(db, crypto, workspaceId);
  const history = new HistoryRepository(db, workspaceId);
  const preferences = new PreferenceRepository(db, dir, crypto);
  const bodyStore = new BodyStore(dir);
  const engine = new RequestEngine({
    collections,
    environments,
    preferences,
    history,
    bodyStore,
    scripts: new ScriptRunner(),
    proxy: new ProxyService(async () => 'DIRECT'),
    ssl: new SslService()
  });
  const preference = defaultPreference(dir);
  preference.timeoutMs = 3000;
  preferences.save(preference);
  const environment = environments.create({
    name: 'Test',
    variables: [
      { key: 'token', value: 'secret-token', secret: true, enabled: true },
      { key: 'baseUrl', value: baseUrl, secret: false, enabled: true }
    ]
  });
  environments.activate(environment.id);
  const collection = collections.create({ name: 'Integration', parentId: null, type: 'collection' });
  collections.update({
    id: collection.id,
    patch: {
      preRequestScript: 'console.log("collection script"); pg.request.headers.upsert({ key: "X-Collection", value: "inherited" });'
    }
  });
  return { db, workspaces, collections, engine, history, environments, collection, bodyStore };
}

describe('request engine', () => {
  it('resolves secrets, runs inherited scripts, sends and records history', async () => {
    const ctx = createEngine();
    const result = await ctx.engine.execute({
      requestId: 'req-1',
      request: definition(),
      collectionId: ctx.collection.id
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.status).toBe(200);
    expect(result.data.testResults).toHaveLength(2);
    expect(result.data.testResults.every((test) => test.passed)).toBe(true);
    expect(result.data.bodyText).toContain('"authorization":"Bearer secret-token"');
    expect(result.data.bodyText).toContain('"pre":"1"');
    expect(result.data.bodyText).toContain('"collection":"inherited"');
    expect(result.data.consoleLogs.length).toBeGreaterThan(0);
    expect(ctx.environments.list().find((env) => env.isActive)?.variables.some((variable) => variable.key === 'marker')).toBe(true);
    expect(ctx.history.list({ limit: 10 }).total).toBe(1);
    ctx.db.close();
  });

  it('resolves folder variables with environment and global precedence', async () => {
    const ctx = createEngine();
    ctx.environments.saveGlobals([{ key: 'shared', value: 'global', secret: false, enabled: true }]);
    const folder = ctx.collections.create({ name: 'Scoped folder', parentId: ctx.collection.id, type: 'folder' });
    ctx.collections.update({
      id: folder.id,
      patch: {
        variables: [
          { key: 'folderVar', value: 'folder', enabled: true },
          { key: 'shared', value: 'folder', enabled: true }
        ]
      }
    });
    const active = ctx.environments.list().find((environment) => environment.isActive)!;
    ctx.environments.update({
      id: active.id,
      variables: [...active.variables, { key: 'shared', value: 'environment', secret: false, enabled: true }]
    });
    const result = await ctx.engine.execute({
      requestId: 'req-scope',
      request: definition({
        url: `${baseUrl}/{{folderVar}}/{{shared}}`,
        preRequestScript: '',
        testScript: ''
      }),
      collectionId: folder.id
    });
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.message);
    expect(result.data.bodyText).toContain('"url":"/folder/environment"');
    ctx.db.close();
  });

  it('returns a validation error for unresolved variables', async () => {
    const ctx = createEngine();
    const result = await ctx.engine.execute({
      requestId: 'req-2',
      request: definition({ url: '{{missing}}/path', preRequestScript: '', testScript: '' })
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe('VALIDATION_ERROR');
    ctx.db.close();
  });

  it('does not execute tests when the server is unreachable', async () => {
    const ctx = createEngine();
    const result = await ctx.engine.execute({
      requestId: 'req-3',
      request: definition({ url: 'http://127.0.0.1:1/nope', preRequestScript: '', testScript: 'pg.test("never", () => {});' })
    });
    expect(result.ok).toBe(false);
    ctx.db.close();
  });
});
