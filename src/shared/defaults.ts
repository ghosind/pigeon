/**
 * Factories for domain objects. Pure functions only.
 */
import type {
  AppPreference,
  AuthConfig,
  CollectionNode,
  Environment,
  EnvironmentVariable,
  ParamItem,
  RequestBody,
  RequestDefinition,
  SavedRequest,
  ShortcutConfig
} from './types';

export const DEFAULT_SHORTCUTS: ShortcutConfig = {
  send: 'CmdOrCtrl+Enter',
  newTab: 'CmdOrCtrl+T',
  closeTab: 'CmdOrCtrl+W',
  save: 'CmdOrCtrl+S',
  focusUrl: 'CmdOrCtrl+L'
};

export function createEmptyParam(): ParamItem {
  return { key: '', value: '', enabled: true, description: '' };
}

export function createEmptyBody(): RequestBody {
  return {
    mode: 'none',
    raw: '',
    rawLanguage: 'json',
    formdata: [],
    urlencoded: [],
    binaryFilePath: ''
  };
}

export function createEmptyAuth(): AuthConfig {
  return {
    type: 'none',
    basic: { username: '', password: '' },
    bearer: { token: '' },
    apikey: { key: '', value: '', in: 'header' }
  };
}

export function createEmptyRequest(name = 'Untitled request'): RequestDefinition {
  return {
    name,
    method: 'GET',
    url: '',
    queryParams: [],
    headers: [],
    body: createEmptyBody(),
    preRequestScript: '',
    testScript: '',
    auth: createEmptyAuth()
  };
}

export function createSavedRequestEntity(
  id: string,
  collectionId: string,
  order: number,
  input?: Partial<RequestDefinition>
): SavedRequest {
  const now = Date.now();
  return {
    ...createEmptyRequest(),
    ...input,
    id,
    collectionId,
    order,
    isDirty: false,
    createdAt: now,
    updatedAt: now
  };
}

export function createCollectionNodeEntity(
  id: string,
  input: Pick<CollectionNode, 'name' | 'parentId' | 'type'> &
    Partial<Pick<CollectionNode, 'description' | 'preRequestScript' | 'testScript' | 'order'>>
): CollectionNode {
  const now = Date.now();
  return {
    id,
    name: input.name,
    description: input.description ?? '',
    parentId: input.parentId,
    type: input.type,
    preRequestScript: input.preRequestScript ?? '',
    testScript: input.testScript ?? '',
    order: input.order ?? now,
    isDirty: false,
    createdAt: now,
    updatedAt: now
  };
}

export function createEmptyEnvironment(name = 'New environment'): Environment {
  const now = Date.now();
  return {
    id: '',
    name,
    isActive: false,
    variables: [],
    isDirty: false,
    createdAt: now,
    updatedAt: now
  };
}

export function createEnvironmentVariable(overrides: Partial<EnvironmentVariable> = {}): EnvironmentVariable {
  return { key: '', value: '', secret: false, enabled: true, ...overrides };
}

export function defaultPreference(dataDir = ''): AppPreference {
  return {
    theme: 'light',
    language: 'system',
    timeoutMs: 30000,
    followRedirect: true,
    maxResponseSizeMb: 50,
    maxRedirects: 10,
    scriptTimeoutMs: 5000,
    historyLimit: 500,
    defaultBodyMode: 'none',
    editorFontSize: 13,
    wordWrap: true,
    proxy: { enable: false, mode: 'system', customUrl: '' },
    ssl: { rejectUnauthorized: true, caPaths: [], clientCerts: [] },
    shortcuts: { ...DEFAULT_SHORTCUTS },
    dataDir
  };
}
