/**
 * Postman Collection v2.1 export.
 *
 * The builder is pure apart from reading the collection snapshot, which makes
 * it straightforward to test with an in-memory fake repository.
 */
import type {
  AuthConfig,
  CollectionNode,
  CollectionSnapshot,
  ParamItem,
  RequestBody,
  RequestDefinition,
  SavedRequest
} from '@shared/types';
import { buildUrl } from '@shared/utils/url';
import { AppError } from '../../utils/errors';

export const POSTMAN_SCHEMA = 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json';

export interface PostmanKeyValue {
  key: string;
  value: string;
  type?: string;
  disabled?: boolean;
  description?: string;
  src?: string;
}

export interface PostmanAuthFile {
  type: string;
  basic?: PostmanKeyValue[];
  bearer?: PostmanKeyValue[];
  apikey?: PostmanKeyValue[];
}

export interface PostmanBodyFile {
  mode: string;
  raw?: string;
  options?: { raw: { language: string } };
  urlencoded?: PostmanKeyValue[];
  formdata?: PostmanKeyValue[];
  file?: { src: string };
}

export interface PostmanRequestFile {
  method: string;
  header: PostmanKeyValue[];
  url: { raw: string; query: PostmanKeyValue[] };
  body?: PostmanBodyFile;
  auth?: PostmanAuthFile;
}

export interface PostmanEventFile {
  listen: 'prerequest' | 'test';
  script: { type: 'text/javascript'; exec: string[] };
}

export interface PostmanItemFile {
  name: string;
  description?: string;
  item?: PostmanItemFile[];
  request?: PostmanRequestFile;
  event?: PostmanEventFile[];
}

export interface PostmanCollectionFile {
  info: { name: string; description?: string; schema: string };
  item: PostmanItemFile[];
  event?: PostmanEventFile[];
}

export interface CollectionExportSource {
  snapshot(): CollectionSnapshot;
}

export interface RequestExportSource {
  get(id: string): SavedRequest | undefined;
}

interface GroupedSnapshot {
  children: Map<string | null, CollectionNode[]>;
  requests: Map<string, SavedRequest[]>;
}

function groupSnapshot(snapshot: CollectionSnapshot, requests: RequestExportSource): GroupedSnapshot {
  const children = new Map<string | null, CollectionNode[]>();
  for (const node of snapshot.nodes) {
    const bucket = children.get(node.parentId) ?? [];
    bucket.push(node);
    children.set(node.parentId, bucket);
  }
  const byCollection = new Map<string, SavedRequest[]>();
  for (const saved of snapshot.requests) {
    const request = requests.get(saved.id) ?? saved;
    const bucket = byCollection.get(request.collectionId) ?? [];
    bucket.push(request);
    byCollection.set(request.collectionId, bucket);
  }
  for (const bucket of children.values()) bucket.sort((a, b) => a.order - b.order);
  for (const bucket of byCollection.values()) bucket.sort((a, b) => a.order - b.order);
  return { children, requests: byCollection };
}

function fullUrl(definition: RequestDefinition): string {
  if (definition.queryParams.length === 0) return definition.url;
  return buildUrl(definition.url, definition.queryParams);
}

function toKeyValue(param: ParamItem): PostmanKeyValue {
  const entry: PostmanKeyValue = { key: param.key, value: param.value };
  if (!param.enabled) entry.disabled = true;
  if (param.description) entry.description = param.description;
  return entry;
}

function toFormData(param: ParamItem): PostmanKeyValue {
  const entry = toKeyValue(param);
  const isFile = param.type === 'file';
  entry.type = isFile ? 'file' : 'text';
  if (isFile) entry.src = param.filePath ?? '';
  return entry;
}

function authFile(auth: AuthConfig): PostmanAuthFile | undefined {
  if (auth.type === 'basic') {
    return {
      type: 'basic',
      basic: [
        { key: 'username', value: auth.basic?.username ?? '', type: 'string' },
        { key: 'password', value: auth.basic?.password ?? '', type: 'string' }
      ]
    };
  }
  if (auth.type === 'bearer') {
    return { type: 'bearer', bearer: [{ key: 'token', value: auth.bearer?.token ?? '', type: 'string' }] };
  }
  if (auth.type === 'apikey') {
    return {
      type: 'apikey',
      apikey: [
        { key: 'key', value: auth.apikey?.key ?? '', type: 'string' },
        { key: 'value', value: auth.apikey?.value ?? '', type: 'string' },
        { key: 'in', value: auth.apikey?.in ?? 'header', type: 'string' }
      ]
    };
  }
  return undefined;
}

function bodyFile(body: RequestBody): PostmanBodyFile | undefined {
  if (body.mode === 'raw') {
    return {
      mode: 'raw',
      raw: body.raw ?? '',
      options: { raw: { language: body.rawLanguage ?? 'text' } }
    };
  }
  if (body.mode === 'urlencoded') {
    return { mode: 'urlencoded', urlencoded: (body.urlencoded ?? []).map(toKeyValue) };
  }
  if (body.mode === 'formdata') {
    return { mode: 'formdata', formdata: (body.formdata ?? []).map(toFormData) };
  }
  if (body.mode === 'binary') {
    return { mode: 'file', file: { src: body.binaryFilePath ?? '' } };
  }
  return undefined;
}

function eventList(preRequestScript: string, testScript: string): PostmanEventFile[] {
  const events: PostmanEventFile[] = [];
  if (preRequestScript.trim()) {
    events.push({
      listen: 'prerequest',
      script: { type: 'text/javascript', exec: preRequestScript.split('\n') }
    });
  }
  if (testScript.trim()) {
    events.push({ listen: 'test', script: { type: 'text/javascript', exec: testScript.split('\n') } });
  }
  return events;
}

function requestItem(definition: RequestDefinition): PostmanItemFile {
  const request: PostmanRequestFile = {
    method: definition.method,
    header: definition.headers.map(toKeyValue),
    url: { raw: fullUrl(definition), query: definition.queryParams.map(toKeyValue) }
  };
  const body = bodyFile(definition.body);
  if (body) request.body = body;
  const auth = authFile(definition.auth);
  if (auth) request.auth = auth;
  const events = eventList(definition.preRequestScript, definition.testScript);
  const item: PostmanItemFile = { name: definition.name, request };
  if (events.length > 0) item.event = events;
  return item;
}

export class PostmanExporter {
  constructor(
    private readonly collections: CollectionExportSource,
    private readonly requests: RequestExportSource
  ) {}

  build(collectionId?: string): PostmanCollectionFile {
    const grouped = groupSnapshot(this.collections.snapshot(), this.requests);
    if (collectionId) {
      const node = this.findNode(collectionId, grouped);
      return this.nodeFile(node, grouped);
    }
    const roots = (grouped.children.get(null) ?? []).filter((node) => node.type === 'collection');
    if (roots.length === 0) {
      throw new AppError('EXPORT_ERROR', 'There are no collections to export');
    }
    if (roots.length === 1) return this.nodeFile(roots[0], grouped);
    return {
      info: { name: 'Pigeon export', schema: POSTMAN_SCHEMA },
      item: roots.map((root) => this.folderItem(root, grouped))
    };
  }

  private findNode(collectionId: string, grouped: GroupedSnapshot): CollectionNode {
    const found = [...grouped.children.values()].flat().find((node) => node.id === collectionId);
    if (!found) throw new AppError('NOT_FOUND', 'Collection was not found');
    return found;
  }

  private nodeFile(node: CollectionNode, grouped: GroupedSnapshot): PostmanCollectionFile {
    const items = this.children(node.id, grouped);
    const file: PostmanCollectionFile = {
      info: { name: node.name, description: node.description, schema: POSTMAN_SCHEMA },
      item: items
    };
    const events = eventList(node.preRequestScript, node.testScript);
    if (events.length > 0) file.event = events;
    if (!file.info.description) delete file.info.description;
    return file;
  }

  private folderItem(node: CollectionNode, grouped: GroupedSnapshot): PostmanItemFile {
    const item: PostmanItemFile = { name: node.name, item: this.children(node.id, grouped) };
    if (node.description) item.description = node.description;
    const events = eventList(node.preRequestScript, node.testScript);
    if (events.length > 0) item.event = events;
    return item;
  }

  private children(parentId: string, grouped: GroupedSnapshot): PostmanItemFile[] {
    const entries: Array<{ order: number; item: PostmanItemFile }> = [];
    for (const node of grouped.children.get(parentId) ?? []) {
      entries.push({ order: node.order, item: this.folderItem(node, grouped) });
    }
    for (const request of grouped.requests.get(parentId) ?? []) {
      entries.push({ order: request.order, item: requestItem(request) });
    }
    return entries.sort((left, right) => left.order - right.order).map((entry) => entry.item);
  }
}
