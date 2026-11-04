/**
 * HTTP Archive (HAR 1.2) import. Parsing is pure and database-free.
 */
import { createEmptyBody } from '@shared/defaults';
import type {
  CollectionNode,
  ImportSummary,
  ParamItem,
  RequestBody,
  RequestDefinition,
  TransferResult
} from '@shared/types';
import { parseUrl } from '@shared/utils/url';
import { AppError } from '../../utils/errors';
import { createLogger } from '../../utils/logger';
import { asRecord, parseMethod, parseParams, textOf } from './postman-mapping';
import type { CollectionImportTarget, RequestImportTarget } from './postman-import';

const logger = createLogger('har-import');
const MAX_ENTRIES = 5000;

export interface ParsedHar {
  name: string;
  requests: RequestDefinition[];
  warnings: string[];
  skipped: number;
}

function coerceLog(raw: unknown): Record<string, unknown> {
  let value = raw;
  if (typeof raw === 'string') {
    try {
      value = JSON.parse(raw) as unknown;
    } catch {
      throw new AppError('IMPORT_ERROR', 'The selected file does not contain valid JSON');
    }
  }
  const record = asRecord(value);
  const log = asRecord(record?.log);
  if (!log) throw new AppError('IMPORT_ERROR', 'This file is not a HAR archive (missing log object)');
  return log;
}

function harName(log: Record<string, unknown>, fallbackName: string): string {
  const pages = Array.isArray(log.pages) ? log.pages : [];
  const firstPage = asRecord(pages[0]);
  const title = textOf(firstPage?.title).trim();
  return title || fallbackName.trim() || 'Imported HAR';
}

function requestName(method: string, url: string): string {
  try {
    const parsed = new URL(url);
    const label = `${parsed.pathname}${parsed.search}`;
    return `${method} ${label === '/' ? parsed.host : label}`.trim();
  } catch {
    return `${method} ${url}`.trim();
  }
}

function harParams(raw: unknown): ParamItem[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => {
    const record = asRecord(entry);
    const key = textOf(record?.name ?? record?.key);
    const value = textOf(record?.value);
    const param: ParamItem = { key, value, enabled: true, description: '' };
    const fileName = textOf(record?.fileName);
    if (fileName) {
      param.type = 'file';
      param.filePath = fileName;
    }
    return param;
  });
}

function urlEncodedParams(text: string): ParamItem[] {
  return [...new URLSearchParams(text).entries()].map(([key, value]) => ({
    key,
    value,
    enabled: true,
    description: ''
  }));
}

function harBody(raw: unknown, warnings: string[]): RequestBody {
  const body = createEmptyBody();
  const postData = asRecord(raw);
  if (!postData) return body;
  const mimeType = textOf(postData.mimeType).toLowerCase();
  const params = harParams(postData.params);
  const text = textOf(postData.text);
  if (mimeType.includes('multipart/form-data') || mimeType.includes('form-data')) {
    body.mode = 'formdata';
    body.formdata = params;
    return body;
  }
  if (mimeType.includes('application/x-www-form-urlencoded')) {
    body.mode = 'urlencoded';
    body.urlencoded = params.length > 0 ? params : text ? urlEncodedParams(text) : [];
    return body;
  }
  if (params.length > 0 && !mimeType) {
    body.mode = 'urlencoded';
    body.urlencoded = params;
    return body;
  }
  if (text) {
    if (textOf(postData.encoding).toLowerCase() === 'base64') {
      warnings.push('A base64-encoded HAR request body was imported as plain text.');
    }
    body.mode = 'raw';
    body.raw = text;
    body.rawLanguage = mimeType.includes('json') ? 'json' : mimeType.includes('xml') ? 'xml' : 'text';
  }
  return body;
}

function parseEntry(entry: unknown, warnings: string[]): RequestDefinition | null {
  const record = asRecord(entry);
  const request = asRecord(record?.request);
  if (!request) return null;
  const rawUrl = textOf(request.url);
  if (!rawUrl) return null;
  const method = parseMethod(request.method, warnings);
  const parsedUrl = parseUrl(rawUrl);
  const query = parseParams(request.queryString, 'query');
  return {
    name: requestName(method, rawUrl),
    method,
    url: `${parsedUrl.base}${parsedUrl.hash}`,
    queryParams: query.length > 0 ? query : parsedUrl.params,
    headers: parseParams(request.headers, 'header'),
    body: harBody(request.postData, warnings),
    preRequestScript: '',
    testScript: '',
    auth: { type: 'none' }
  };
}

export function parseHar(raw: unknown, fallbackName: string): ParsedHar {
  const log = coerceLog(raw);
  if (!Array.isArray(log.entries)) {
    throw new AppError('IMPORT_ERROR', 'This HAR archive does not contain any entries');
  }
  const warnings: string[] = [];
  const requests: RequestDefinition[] = [];
  let skipped = 0;
  for (const entry of log.entries) {
    if (requests.length >= MAX_ENTRIES) {
      warnings.push(`The HAR archive contains more than ${MAX_ENTRIES} usable entries; the rest were skipped.`);
      skipped += log.entries.length - requests.length - skipped;
      break;
    }
    const definition = parseEntry(entry, warnings);
    if (!definition) {
      skipped += 1;
      continue;
    }
    requests.push(definition);
  }
  if (skipped > 0) warnings.push(`Skipped ${skipped} HAR entries that could not be imported.`);
  return { name: harName(log, fallbackName), requests, warnings, skipped };
}

export class HarImporter {
  constructor(
    private readonly collections: CollectionImportTarget,
    private readonly requests: RequestImportTarget
  ) {}

  import(raw: unknown, sourceName: string): TransferResult {
    const parsed = parseHar(raw, sourceName);
    const root: CollectionNode = this.collections.create({
      name: parsed.name,
      parentId: null,
      type: 'collection'
    });
    let order = 1000;
    for (const definition of parsed.requests) {
      this.requests.insertDefinition(root.id, definition, order);
      order += 1000;
    }
    const summary: ImportSummary = {
      collections: 1,
      folders: 0,
      requests: parsed.requests.length,
      environments: 0,
      skipped: parsed.skipped,
      warnings: [...parsed.warnings]
    };
    logger.info('HAR archive imported', {
      collectionId: root.id,
      requests: summary.requests,
      skipped: summary.skipped
    });
    return { summary, importedCollectionIds: [root.id] };
  }
}
