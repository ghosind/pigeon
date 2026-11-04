/**
 * Composes main-process services once. No globals beyond this container are
 * required by IPC handlers.
 */
import path from 'node:path';
import { session } from 'electron';
import { createLogger } from './utils/logger';
import { CryptoService } from './services/crypto.service';
import { PigeonDatabase } from './services/database';
import { CollectionRepository } from './repositories/collection.repository';
import { RequestRepository } from './repositories/request.repository';
import { WorkspaceRepository } from './repositories/workspace.repository';
import { EnvironmentRepository } from './repositories/environment.repository';
import { HistoryRepository } from './repositories/history.repository';
import { PreferenceRepository } from './repositories/preference.repository';
import { BodyStore } from './services/body-store';
import { ScriptRunner } from './services/script-runner';
import { SslService } from './services/ssl.service';
import { ProxyService } from './services/proxy.service';
import { RequestEngine } from './services/request-engine';
import { PostmanImporter } from './services/transfer/postman-import';
import { PostmanExporter } from './services/transfer/postman-export';
import { HarImporter } from './services/transfer/har-import';
import { HarExporter } from './services/transfer/har-export';
import { BackupService } from './services/transfer/backup.service';
import { LocalOnlyCloudSyncAdapter } from './services/cloud-sync.adapter';

const logger = createLogger('context');

export class AppContext {
  readonly crypto: CryptoService;
  readonly db: PigeonDatabase;
  readonly workspaces: WorkspaceRepository;
  readonly collections: CollectionRepository;
  readonly requests: RequestRepository;
  readonly environments: EnvironmentRepository;
  readonly history: HistoryRepository;
  readonly preferences: PreferenceRepository;
  readonly bodyStore: BodyStore;
  readonly scripts: ScriptRunner;
  readonly ssl: SslService;
  readonly proxy: ProxyService;
  readonly engine: RequestEngine;
  readonly postmanImporter: PostmanImporter;
  readonly postmanExporter: PostmanExporter;
  readonly harImporter: HarImporter;
  readonly harExporter: HarExporter;
  readonly backup: BackupService;
  readonly cloudSync: LocalOnlyCloudSyncAdapter;
  readonly dataDir: string;

  constructor(dataDir: string) {
    this.dataDir = dataDir;
    this.crypto = new CryptoService(dataDir);
    this.db = new PigeonDatabase(dataDir);
    this.workspaces = new WorkspaceRepository(this.db);
    this.collections = new CollectionRepository(this.db, () => this.workspaces.activeId());
    this.requests = new RequestRepository(
      this.db,
      (id) => Boolean(this.collections.get(id)),
      () => this.workspaces.activeId()
    );
    this.environments = new EnvironmentRepository(
      this.db,
      this.crypto,
      () => this.workspaces.activeId()
    );
    this.history = new HistoryRepository(this.db, () => this.workspaces.activeId());
    this.preferences = new PreferenceRepository(this.db, dataDir, this.crypto);
    this.bodyStore = new BodyStore(dataDir);
    this.scripts = new ScriptRunner();
    this.ssl = new SslService();
    this.proxy = new ProxyService((url) => session.defaultSession.resolveProxy(url));
    this.engine = new RequestEngine({
      collections: this.collections,
      environments: this.environments,
      preferences: this.preferences,
      history: this.history,
      bodyStore: this.bodyStore,
      scripts: this.scripts,
      proxy: this.proxy,
      ssl: this.ssl
    });
    this.postmanImporter = new PostmanImporter(this.collections, this.requests);
    this.postmanExporter = new PostmanExporter(this.collections, this.requests);
    this.harImporter = new HarImporter(this.collections, this.requests);
    this.harExporter = new HarExporter(this.collections, this.requests);
    this.backup = new BackupService(this.db, this.collections, this.requests, this.environments, this.preferences, () => this.workspaces.activeId());
    this.cloudSync = new LocalOnlyCloudSyncAdapter();
    logger.info('Application context ready', { dataDir, database: path.basename(this.db.filePath) });
  }

  close(): void {
    this.db.close();
  }
}
