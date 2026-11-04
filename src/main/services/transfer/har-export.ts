/**
 * HTTP Archive (HAR 1.2) export.
 */
import type {
  CollectionSnapshot,
  ParamItem,
  RequestBody,
  RequestDefinition,
  SavedRequest
} from '@shared/types';
import { buildUrl } from '@shared/utils/url';
import { AppError } from '../../utils/errors';
import type { CollectionExportSource, RequestExportSource } from './postman-export';

export interface HarQueryStringEntry {
  name: string;
  value: string;
}

export interface HarHeaderEntry {
  name: string;
  value: string;
}

export interface HarPostDataParam {
  name: string;
  value: string;
  fileName?: string;
}

export interface HarPostDataFile {
  mimeType: string;
  text?: string;
  params?: HarPostDataParam[];
}

export interface HarRequestFile {
  method: string;
  url: string;
  httpVersion: string;
  cookies: unknown[];
  headers: HarHeaderEntry[];
  queryString: HarQueryStringEntry[];
  postData?: HarPostDataFile;
  headersSize: number;
  bodySize: number;
}

export interface HarEntryFile {
  startedDateTime: string;
  time: number;
  request: HarRequestFile;
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    cookies: unknown[];
    headers: unknown[];
    content: { size: number; mimeType: string };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: Record<string, never>;
  timings: { send: number; wait: number; receive: number };
}

export interface HarFile {
  log: {
    version: '1.2';
    creator: { name: string; version: string };
    entries: HarEntryFile[];
  };
}

const CREATOR = { name: 'Pigeon', version: '0.1.0' };

function fullUrl(definition: RequestDefinition): string {
  if (definition.queryParams.length === 0) return definition.url;
  return buildUrl(definition.url, definition.queryParams);
}

function enabledParams(params: ParamItem[]): ParamItem[] {
  return params.filter((param) => param.enabled);
}

function headerEntries(params: ParamItem[]): HarHeaderEntry[] {
  return enabledParams(params).map((param) => ({ name: param.key, value: param.value }));
}

function postData(body: RequestBody): HarPostDataFile | undefined {
  if (body.mode === 'raw') {
    const mimeType =
      body.rawLanguage === 'json'
        ? 'application/json'
        : body.rawLanguage === 'xml'
          ? 'application/xml'
          : 'text/plain';
    return { mimeType, text: body.raw ?? '' };
  }
  if (body.mode === 'urlencoded') {
    const params = enabledParams(body.urlencoded ?? []).map((param) => ({
      name: param.key,
      value: param.value
    }));
    const text = params
      .map((param) => `${encodeURIComponent(param.name)}=${encodeURIComponent(param.value)}`)
      .join('&');
    return { mimeType: 'application/x-www-form-urlencoded', params, text };
  }
  if (body.mode === 'formdata') {
    const params = enabledParams(body.formdata ?? []).map((param) => {
      const entry: HarPostDataParam = { name: param.key, value: param.value };
      if (param.type === 'file') {
        entry.fileName = (param.filePath ?? '').split(/[\\/]/).pop() ?? '';
      }
      return entry;
    });
    return { mimeType: 'multipart/form-data', params };
  }
  return undefined;
}

function entryFor(definition: SavedRequest): HarEntryFile {
  const request: HarRequestFile = {
    method: definition.method,
    url: fullUrl(definition),
    httpVersion: 'HTTP/1.1',
    cookies: [],
    headers: headerEntries(definition.headers),
    queryString: enabledParams(definition.queryParams).map((param) => ({
      name: param.key,
      value: param.value
    })),
    headersSize: -1,
    bodySize: -1
  };
  const data = postData(definition.body);
  if (data) request.postData = data;
  return {
    startedDateTime: new Date(definition.createdAt).toISOString(),
    time: 0,
    request,
    response: {
      status: 0,
      statusText: '',
      httpVersion: 'HTTP/1.1',
      cookies: [],
      headers: [],
      content: { size: 0, mimeType: 'text/plain' },
      redirectURL: '',
      headersSize: -1,
      bodySize: 0
    },
    cache: {},
    timings: { send: 0, wait: 0, receive: 0 }
  };
}

function collectionSubtree(snapshot: CollectionSnapshot, rootId: string): Set<string> {
  const ids = new Set<string>([rootId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of snapshot.nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return ids;
}

export class HarExporter {
  constructor(
    private readonly collections: CollectionExportSource,
    private readonly requests: RequestExportSource
  ) {}

  build(collectionId?: string): HarFile {
    const snapshot = this.collections.snapshot();
    let selected = snapshot.requests;
    if (collectionId) {
      const node = snapshot.nodes.find((candidate) => candidate.id === collectionId);
      if (!node) throw new AppError('NOT_FOUND', 'Collection was not found');
      const ids = collectionSubtree(snapshot, collectionId);
      selected = snapshot.requests.filter((request) => ids.has(request.collectionId));
    }
    const entries = selected
      .map((request) => this.requests.get(request.id) ?? request)
      .sort((left, right) => left.order - right.order)
      .map(entryFor);
    return { log: { version: '1.2', creator: { ...CREATOR }, entries } };
  }
}
