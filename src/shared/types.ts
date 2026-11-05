/**
 * Shared domain types used by both the Electron main process and the renderer.
 * This module must stay free of Node and DOM APIs.
 */

export type HttpMethod =
  | 'GET'
  | 'POST'
  | 'PUT'
  | 'PATCH'
  | 'DELETE'
  | 'HEAD'
  | 'OPTIONS'
  | 'CONNECT';

export const HTTP_METHODS: HttpMethod[] = [
  'GET',
  'POST',
  'PUT',
  'PATCH',
  'DELETE',
  'HEAD',
  'OPTIONS',
  'CONNECT'
];

export type BodyMode = 'none' | 'formdata' | 'urlencoded' | 'raw' | 'binary';
export type RawLanguage = 'json' | 'xml' | 'text';
export type AuthType = 'none' | 'basic' | 'bearer' | 'apikey';
export type ThemePreference = 'light' | 'dark' | 'system';
export type LanguagePreference = 'system' | 'en' | 'zh-CN';

/** A plain (non-secret) variable defined on a workspace or collection/folder. */
export interface VariableEntry {
  key: string;
  value: string;
  enabled: boolean;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}

/** A key/value row used by query parameters, headers and form bodies. */
export interface ParamItem {
  key: string;
  value: string;
  enabled: boolean;
  description?: string;
  /** Form-data rows only. */
  type?: 'text' | 'file';
  /** Absolute path for form-data file rows. */
  filePath?: string;
}

export interface RequestBody {
  mode: BodyMode;
  raw?: string;
  rawLanguage?: RawLanguage;
  formdata?: ParamItem[];
  urlencoded?: ParamItem[];
  binaryFilePath?: string;
}

export interface AuthConfig {
  type: AuthType;
  basic?: { username: string; password: string };
  bearer?: { token: string };
  apikey?: { key: string; value: string; in: 'header' | 'query' };
}

/** Editable definition of a request. Shared by tabs, history and the engine. */
export interface RequestDefinition {
  name: string;
  method: HttpMethod;
  url: string;
  queryParams: ParamItem[];
  headers: ParamItem[];
  body: RequestBody;
  preRequestScript: string;
  testScript: string;
  auth: AuthConfig;
}

export interface CloudFields {
  cloudId?: string;
  syncVersion?: number;
  isDirty: boolean;
}

export interface SavedRequest extends RequestDefinition, CloudFields {
  id: string;
  collectionId: string;
  order: number;
  createdAt: number;
  updatedAt: number;
}

export type CollectionNodeType = 'collection' | 'folder';

export interface CollectionNode extends CloudFields {
  id: string;
  name: string;
  description: string;
  parentId: string | null;
  type: CollectionNodeType;
  preRequestScript: string;
  testScript: string;
  variables: VariableEntry[];
  order: number;
  createdAt: number;
  updatedAt: number;
}

export interface CollectionSnapshot {
  nodes: CollectionNode[];
  requests: SavedRequest[];
}

export interface EnvironmentVariable {
  key: string;
  value: string;
  secret: boolean;
  enabled: boolean;
  /** Renderer hint: a secret is stored even though its value is masked. */
  hasValue?: boolean;
}

export interface Environment extends CloudFields {
  id: string;
  name: string;
  isActive: boolean;
  variables: EnvironmentVariable[];
  createdAt: number;
  updatedAt: number;
}

export interface ResponseMeta {
  status: number;
  statusText: string;
  duration: number;
  size: number;
  responseHeaders: Record<string, string[]>;
  receivedAt: number;
  contentType: string;
}

export interface HistoryRecord {
  id: string;
  snapshot: RequestDefinition;
  responseMeta: ResponseMeta;
  sentAt: number;
  environmentName?: string;
  url: string;
  method: HttpMethod;
}

export interface HistoryListItem extends HistoryRecord {}
export interface HistoryPage {
  items: HistoryRecord[];
  total: number;
}

export interface HistoryQuery {
  search?: string;
  limit?: number;
  offset?: number;
}

/* ------------------------------------------------------------------ */
/* Request execution                                                   */
/* ------------------------------------------------------------------ */

export interface ConsoleLogEntry {
  id: string;
  level: 'log' | 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: number;
  scope: 'pre-request' | 'test';
}

export interface ScriptTestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

export interface RedirectHop {
  status: number;
  url: string;
}

export interface SendRequestPayload {
  requestId: string;
  request: RequestDefinition;
  /** Parent folder used to inherit collection/folder scripts. */
  collectionId?: string;
  /** Defaults to the active environment when omitted. */
  environmentId?: string;
  /** Run-scoped variables that never touch the database. */
  localVariables?: Record<string, string>;
  /** When false the request is not written to history. Defaults to true. */
  recordHistory?: boolean;
}

export interface ResponseResult {
  requestId: string;
  status: number;
  statusText: string;
  httpVersion: string;
  durationMs: number;
  sizeBytes: number;
  headers: Record<string, string[]>;
  contentType: string;
  charset: string;
  isBinary: boolean;
  truncated: boolean;
  bodyId: string | null;
  bodyText?: string;
  /** First 64 KB when the full body is too large to inline. */
  bodyPreview?: string;
  bodyTextLength: number;
  imageDataUrl?: string;
  receivedAt: number;
  finalUrl: string;
  redirects: RedirectHop[];
  requestHeaders: Record<string, string>;
  testResults: ScriptTestResult[];
  consoleLogs: ConsoleLogEntry[];
  environmentUpdates: Record<string, string>;
  globalUpdates: Record<string, string>;
}

export type ApiErrorCode =
  | 'VALIDATION_ERROR'
  | 'NOT_FOUND'
  | 'REQUEST_FAILED'
  | 'REQUEST_CANCELLED'
  | 'REQUEST_TIMEOUT'
  | 'RESPONSE_TOO_LARGE'
  | 'SSL_ERROR'
  | 'PROXY_ERROR'
  | 'SCRIPT_ERROR'
  | 'SCRIPT_TIMEOUT'
  | 'CLOUD_NOT_IMPLEMENTED'
  | 'IMPORT_ERROR'
  | 'EXPORT_ERROR'
  | 'DATABASE_ERROR'
  | 'IO_ERROR'
  | 'UNKNOWN';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  details?: string;
}

export type ApiResult<T> = { ok: true; data: T } | { ok: false; error: ApiError };

/* ------------------------------------------------------------------ */
/* Settings                                                           */
/* ------------------------------------------------------------------ */

export interface ProxyConfig {
  enable: boolean;
  mode: 'system' | 'custom';
  customUrl?: string;
}

export interface ClientCertItem {
  host: string;
  kind: 'pem' | 'pfx';
  certPath: string;
  keyPath?: string;
  passphrase?: string;
}

export interface SSLConfig {
  rejectUnauthorized: boolean;
  caPaths: string[];
  clientCerts: ClientCertItem[];
}

export interface ShortcutConfig {
  send: string;
  newTab: string;
  closeTab: string;
  save: string;
  focusUrl: string;
}

export interface AppPreference {
  theme: ThemePreference;
  language: LanguagePreference;
  timeoutMs: number;
  followRedirect: boolean;
  maxResponseSizeMb: number;
  maxRedirects: number;
  scriptTimeoutMs: number;
  historyLimit: number;
  defaultBodyMode: BodyMode;
  editorFontSize: number;
  wordWrap: boolean;
  proxy: ProxyConfig;
  ssl: SSLConfig;
  shortcuts: ShortcutConfig;
  dataDir: string;
}

export interface AppInfo {
  version: string;
  electronVersion: string;
  nodeVersion: string;
  platform: string;
  dataDir: string;
  portable: boolean;
}

/* ------------------------------------------------------------------ */
/* Import / export                                                    */
/* ------------------------------------------------------------------ */

export interface ImportSummary {
  collections: number;
  folders: number;
  requests: number;
  environments: number;
  skipped: number;
  warnings: string[];
}

export interface ExportSummary {
  path: string;
  collections?: number;
  requests?: number;
  environments?: number;
}

export interface TransferResult {
  summary: ImportSummary;
  importedCollectionIds: string[];
}

export interface CloudConnectionStatus {
  connected: boolean;
  provider: string;
  message: string;
  user?: { id: string; name: string; email: string };
}

export interface CloudCollectionDescriptor {
  cloudId: string;
  name: string;
  updatedAt: number;
}

export interface CloudSyncAdapter {
  readonly provider: string;
  status(): Promise<CloudConnectionStatus>;
  login(): Promise<CloudConnectionStatus>;
  listCollections(): Promise<CloudCollectionDescriptor[]>;
  pullCollection(cloudId: string): Promise<unknown>;
  pushCollection(collectionId: string): Promise<{ cloudId: string; syncVersion: number }>;
  pullEnvironment(cloudId: string): Promise<unknown>;
  pushEnvironment(environmentId: string): Promise<{ cloudId: string; syncVersion: number }>;
}

/* ------------------------------------------------------------------ */
/* Renderer helpers                                                   */
/* ------------------------------------------------------------------ */

export interface OpenTabOptions {
  request?: Partial<RequestDefinition>;
  sourceRequestId?: string;
  collectionId?: string;
  name?: string;
  fromHistory?: boolean;
}

export type ToastKind = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
}
