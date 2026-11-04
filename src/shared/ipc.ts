/**
 * Typed IPC contract. Every renderer -> main call goes through this surface.
 * Channel names are namespaced and payloads are validated in the main process.
 */
import type {
  ApiResult,
  AppInfo,
  AppPreference,
  CollectionNode,
  CollectionSnapshot,
  CloudConnectionStatus,
  Workspace,
  Environment,
  EnvironmentVariable,
  ExportSummary,
  CloudCollectionDescriptor,
  HistoryPage,
  HistoryQuery,
  HttpMethod,
  ImportSummary,
  RequestDefinition,
  ResponseResult,
  SavedRequest,
  SendRequestPayload,
  TransferResult
} from './types';

export const IPC = {
  appInfo: 'app:info',
  appRelaunch: 'app:relaunch',
  appOpenExternal: 'app:open-external',
  appShowItem: 'app:show-item',

  collectionSnapshot: 'collection:snapshot',
  collectionCreate: 'collection:create',
  collectionUpdate: 'collection:update',
  collectionDelete: 'collection:delete',
  collectionReorder: 'collection:reorder',
  collectionMove: 'collection:move',

  requestCreate: 'request:create',
  requestUpdate: 'request:update',
  requestDelete: 'request:delete',
  requestDuplicate: 'request:duplicate',

  envList: 'env:list',
  envCreate: 'env:create',
  envUpdate: 'env:update',
  envDelete: 'env:delete',
  envActivate: 'env:activate',
  envReveal: 'env:reveal',
  envGlobals: 'env:globals',
  envSaveGlobals: 'env:save-globals',

  historyList: 'history:list',
  historyDelete: 'history:delete',
  historyClear: 'history:clear',

  requestSend: 'request:send',
  requestCancel: 'request:cancel',

  responseReadText: 'response:read-text',
  responseSaveAs: 'response:save-as',

  transferImportPostman: 'transfer:import-postman',
  transferImportHar: 'transfer:import-har',
  transferImportEnvironment: 'transfer:import-environment',
  transferImportBackup: 'transfer:import-backup',
  transferExportPostman: 'transfer:export-postman',
  transferExportHar: 'transfer:export-har',
  transferExportBackup: 'transfer:export-backup',

  settingsGet: 'settings:get',
  settingsSave: 'settings:save',
  settingsPickFile: 'settings:pick-file',
  settingsPickDirectory: 'settings:pick-directory',
  settingsChangeDataDir: 'settings:change-data-dir',

  workspaceList: 'workspace:list',
  workspaceCreate: 'workspace:create',
  workspaceRename: 'workspace:rename',
  workspaceActivate: 'workspace:activate',
  workspaceDelete: 'workspace:delete',

  syncStatus: 'sync:status',
  syncLogin: 'sync:login',
  syncList: 'sync:list',
  syncPush: 'sync:push',
  syncPull: 'sync:pull'
} as const;

export interface CollectionCreateInput {
  name: string;
  parentId: string | null;
  type: 'collection' | 'folder';
}

export interface CollectionUpdateInput {
  id: string;
  patch: Partial<Pick<CollectionNode, 'name' | 'description' | 'preRequestScript' | 'testScript'>>;
}

export interface RequestCreateInput {
  collectionId: string;
  name?: string;
  request?: Partial<RequestDefinition>;
}

export interface RequestUpdateInput {
  id: string;
  patch: Partial<RequestDefinition>;
}

export interface EnvironmentCreateInput {
  name: string;
  variables?: EnvironmentVariable[];
}

export interface EnvironmentUpdateInput {
  id: string;
  name?: string;
  variables?: EnvironmentVariable[];
}

export interface RevealVariableInput {
  environmentId: string | null;
  key: string;
}

export interface ReadTextInput {
  bodyId: string;
  offset: number;
  length: number;
}

export interface ReadTextResult {
  text: string;
  nextOffset: number;
  totalLength: number;
}

export interface SaveResponseInput {
  bodyId: string;
  suggestedName: string;
}

export interface FileFilter {
  name: string;
  extensions: string[];
}

export interface PickFileInput {
  title?: string;
  filters?: FileFilter[];
}

export interface ExportInput {
  collectionId?: string;
}

export interface CloseTabRequest {
  requestId: string;
}

export interface SyncCollectionInput {
  collectionId: string;
}

export interface SyncCollectionRef {
  cloudId: string;
}

/**
 * The API exposed as `window.pigeon` by the preload script.
 * All calls return an ApiResult so failures survive IPC serialization.
 */
export interface PigeonApi {
  app: {
    info(): Promise<ApiResult<AppInfo>>;
    relaunch(): Promise<ApiResult<null>>;
    openExternal(url: string): Promise<ApiResult<null>>;
    showItemInFolder(path: string): Promise<ApiResult<null>>;
  };
  collections: {
    snapshot(): Promise<ApiResult<CollectionSnapshot>>;
    create(input: CollectionCreateInput): Promise<ApiResult<CollectionNode>>;
    update(input: CollectionUpdateInput): Promise<ApiResult<CollectionNode>>;
    remove(id: string): Promise<ApiResult<null>>;
    reorder(parentId: string | null, orderedIds: string[]): Promise<ApiResult<null>>;
    move(id: string, kind: 'node' | 'request', parentId: string | null): Promise<ApiResult<null>>;
  };
  requests: {
    create(input: RequestCreateInput): Promise<ApiResult<SavedRequest>>;
    update(input: RequestUpdateInput): Promise<ApiResult<SavedRequest>>;
    remove(id: string): Promise<ApiResult<null>>;
    duplicate(id: string): Promise<ApiResult<SavedRequest>>;
  };
  env: {
    list(): Promise<ApiResult<Environment[]>>;
    create(input: EnvironmentCreateInput): Promise<ApiResult<Environment>>;
    update(input: EnvironmentUpdateInput): Promise<ApiResult<Environment>>;
    remove(id: string): Promise<ApiResult<null>>;
    activate(id: string): Promise<ApiResult<Environment[]>>;
    reveal(input: RevealVariableInput): Promise<ApiResult<string>>;
    globals(): Promise<ApiResult<EnvironmentVariable[]>>;
    saveGlobals(variables: EnvironmentVariable[]): Promise<ApiResult<EnvironmentVariable[]>>;
  };
  history: {
    list(query: HistoryQuery): Promise<ApiResult<HistoryPage>>;
    remove(id: string): Promise<ApiResult<null>>;
    clear(): Promise<ApiResult<null>>;
  };
  request: {
    send(payload: SendRequestPayload): Promise<ApiResult<ResponseResult>>;
    cancel(requestId: string): Promise<ApiResult<null>>;
  };
  response: {
    readText(input: ReadTextInput): Promise<ApiResult<ReadTextResult>>;
    saveAs(input: SaveResponseInput): Promise<ApiResult<string | null>>;
  };
  transfer: {
    importPostman(): Promise<ApiResult<TransferResult | null>>;
    importHar(): Promise<ApiResult<TransferResult | null>>;
    importEnvironment(): Promise<ApiResult<ImportSummary | null>>;
    importBackup(): Promise<ApiResult<TransferResult | null>>;
    exportPostman(input: ExportInput): Promise<ApiResult<ExportSummary | null>>;
    exportHar(input: ExportInput): Promise<ApiResult<ExportSummary | null>>;
    exportBackup(): Promise<ApiResult<ExportSummary | null>>;
  };
  workspaces: {
    list(): Promise<ApiResult<Workspace[]>>;
    create(name: string): Promise<ApiResult<Workspace[]>>;
    rename(id: string, name: string): Promise<ApiResult<Workspace[]>>;
    activate(id: string): Promise<ApiResult<Workspace[]>>;
    remove(id: string): Promise<ApiResult<Workspace[]>>;
  };
  settings: {
    get(): Promise<ApiResult<AppPreference>>;
    save(preference: AppPreference): Promise<ApiResult<AppPreference>>;
    pickFile(input: PickFileInput): Promise<ApiResult<string | null>>;
    pickDirectory(): Promise<ApiResult<string | null>>;
    changeDataDir(path: string): Promise<ApiResult<{ restarting: boolean }>>;
  };
  sync: {
    status(): Promise<ApiResult<CloudConnectionStatus>>;
    login(): Promise<ApiResult<CloudConnectionStatus>>;
    list(): Promise<ApiResult<CloudCollectionDescriptor[]>>;
    push(input: SyncCollectionInput): Promise<ApiResult<never>>;
    pull(input: SyncCollectionRef): Promise<ApiResult<never>>;
  };
}

/** Compile-time helper used by the renderer to inspect methods. */
export type IpcMethodName = keyof PigeonApi;
export type MethodArg<T> = T extends (arg: infer A) => unknown ? A : never;

export interface RequestDraftDefaults {
  method?: HttpMethod;
  name?: string;
}
