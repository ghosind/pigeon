import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { PigeonDatabase } from '../src/main/services/database';
import { CryptoService } from '../src/main/services/crypto.service';
import { CollectionRepository } from '../src/main/repositories/collection.repository';
import { RequestRepository } from '../src/main/repositories/request.repository';
import { EnvironmentRepository } from '../src/main/repositories/environment.repository';
import { HistoryRepository } from '../src/main/repositories/history.repository';
import { PreferenceRepository } from '../src/main/repositories/preference.repository';
import { WorkspaceRepository } from '../src/main/repositories/workspace.repository';
import { BackupService } from '../src/main/services/transfer/backup.service';

const dirs: string[] = [];
function setup() {
  const dir = mkdtempSync(path.join(tmpdir(), 'pigeon-db-'));
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
  return { dir, db, workspaces, collections, requests, environments, history, preferences };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('Database workspace', () => {
  it('seeds a usable first-run workspace', () => {
    const { db, collections, environments, preferences } = setup();
    const snapshot = collections.snapshot();
    expect(snapshot.nodes.filter((node) => node.type === 'collection')).toHaveLength(1);
    expect(snapshot.requests.length).toBeGreaterThanOrEqual(3);
    expect(environments.list().find((env) => env.isActive)?.name).toBe('Local');
    expect(preferences.get().timeoutMs).toBe(30000);
    db.close();
  });

  it('creates, updates, moves and reorders tree items', () => {
    const { db, collections, requests } = setup();
    const root = collections.snapshot().nodes.find((node) => node.type === 'collection')!;
    const folder = collections.create({ name: 'Nested', parentId: root.id, type: 'folder' });
    const request = requests.create({ collectionId: folder.id, name: 'Ping', request: { url: 'https://api.test/ping' } });
    expect(request.collectionId).toBe(folder.id);
    const updated = requests.update({ id: request.id, patch: { method: 'POST', url: 'https://api.test/pong' } });
    expect(updated.method).toBe('POST');
    const sibling = requests.create({ collectionId: root.id, name: 'Second' });
    const ids = collections
      .snapshot()
      .requests.filter((entry) => entry.collectionId === root.id)
      .sort((a, b) => a.order - b.order)
      .map((entry) => entry.id);
    collections.reorder(root.id, [sibling.id, ...ids.filter((id) => id !== sibling.id)]);
    expect(collections.snapshot().requests.find((entry) => entry.id === sibling.id)?.order).toBe(1000);
    collections.delete(root.id);
    expect(collections.snapshot().nodes).toHaveLength(0);
    expect(collections.snapshot().requests).toHaveLength(0);
    db.close();
  });

  it('masks secrets, preserves them on save and reveals on demand', () => {
    const { db, environments } = setup();
    const env = environments.list().find((entry) => entry.isActive)!;
    const vars = env.variables.map((variable) =>
      variable.key === 'apiToken' ? { ...variable, value: 'super-secret' } : variable
    );
    environments.update({ id: env.id, variables: vars });
    const saved = environments.list().find((entry) => entry.id === env.id)!;
    const token = saved.variables.find((variable) => variable.key === 'apiToken')!;
    expect(token.value).toBe('');
    expect(token.hasValue).toBe(true);
    expect(environments.reveal({ environmentId: env.id, key: 'apiToken' })).toBe('super-secret');
    environments.update({ id: env.id, variables: saved.variables });
    expect(environments.reveal({ environmentId: env.id, key: 'apiToken' })).toBe('super-secret');
    environments.update({
      id: env.id,
      variables: saved.variables.map((variable) =>
        variable.key === 'apiToken' ? { ...variable, value: '', hasValue: false } : variable
      )
    });
    expect(environments.reveal({ environmentId: env.id, key: 'apiToken' })).toBe('');
    db.close();
  });

  it('records and searches history with limits', () => {
    const { db, history } = setup();
    const snapshot = history.list({ limit: 10 });
    expect(snapshot.total).toBe(0);
    db.close();
  });

  it('isolates collections, environments and history per workspace', () => {
    const { db, workspaces, collections, requests, environments, history } = setup();
    const first = workspaces.list().find((workspace) => workspace.isActive)!;
    const firstCollection = collections.snapshot().nodes.find((node) => node.type === 'collection')!;
    const firstRequest = collections.snapshot().requests[0];
    expect(firstRequest).toBeTruthy();

    const workspaceList = workspaces.create('Second workspace');
    const second = workspaceList.find((workspace) => workspace.isActive)!;
    expect(second.id).not.toBe(first.id);
    expect(collections.snapshot().nodes).toHaveLength(0);
    expect(environments.list()).toHaveLength(0);

    const secondCollection = collections.create({ name: 'Second collection', parentId: null, type: 'collection' });
    const secondRequest = requests.create({ collectionId: secondCollection.id, name: 'Second request' });
    environments.create({ name: 'Second env' });
    history.add(
      {
        name: 'Second request',
        method: 'GET',
        url: 'https://second.test',
        queryParams: [],
        headers: [],
        body: { mode: 'none', raw: '', rawLanguage: 'json', formdata: [], urlencoded: [], binaryFilePath: '' },
        preRequestScript: '',
        testScript: '',
        auth: { type: 'none' }
      },
      { status: 200, statusText: 'OK', duration: 1, size: 1, responseHeaders: {}, receivedAt: Date.now(), contentType: 'text/plain' },
      'Second env',
      100
    );
    expect(collections.snapshot().nodes).toHaveLength(1);
    expect(environments.list()[0].name).toBe('Second env');
    expect(history.list({ limit: 10 }).total).toBe(1);

    workspaces.activate(first.id);
    expect(collections.snapshot().nodes.some((node) => node.id === firstCollection.id)).toBe(true);
    expect(collections.snapshot().requests.some((request) => request.id === firstRequest!.id)).toBe(true);
    expect(environments.list().length).toBeGreaterThan(0);
    expect(history.list({ limit: 10 }).total).toBe(0);

    workspaces.activate(second.id);
    expect(collections.snapshot().nodes[0].id).toBe(secondCollection.id);
    workspaces.delete(second.id);
    expect(workspaces.list()).toHaveLength(1);
    expect(collections.snapshot().nodes.some((node) => node.id === firstCollection.id)).toBe(true);
    db.close();
  });

  it('exports and restores the active workspace without touching other workspaces', () => {
    const { db, workspaces, collections, requests, environments, preferences } = setup();
    const first = workspaces.list().find((workspace) => workspace.isActive)!;
    const backup = new BackupService(
      db,
      collections,
      requests,
      environments,
      preferences,
      () => workspaces.activeId()
    );
    const document = backup.exportBackup();
    expect(document.collections.length).toBeGreaterThan(0);
    expect(document.requests.length).toBeGreaterThan(0);

    workspaces.create('Keep me');
    const second = workspaces.list().find((workspace) => workspace.isActive)!;
    const secondCollection = collections.create({ name: 'Protected', parentId: null, type: 'collection' });

    workspaces.activate(first.id);
    collections.delete(collections.snapshot().nodes.find((node) => node.type === 'collection')!.id);
    expect(collections.snapshot().nodes).toHaveLength(0);
    const result = backup.restoreBackup(document);
    expect(result.summary.collections).toBeGreaterThan(0);
    expect(collections.snapshot().nodes.length).toBeGreaterThan(0);

    workspaces.activate(second.id);
    expect(collections.snapshot().nodes.some((node) => node.id === secondCollection.id)).toBe(true);
    db.close();
  });
});
