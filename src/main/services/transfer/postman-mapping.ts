/**
 * Pure Postman v2.1 request mapping helpers (headers, URL, body, auth, scripts).
 * No database access; safe to unit test.
 */
import { createEmptyAuth, createEmptyBody } from '@shared/defaults';
import { HTTP_METHODS, type AuthConfig, type ParamItem, type RequestBody, type RequestDefinition } from '@shared/types';
import { parseUrl } from '@shared/utils/url';

export type ParamKind = 'header' | 'query' | 'urlencoded' | 'formdata';

export function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : undefined;
}

export function textOf(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '';
}

export function descriptionOf(value: unknown): string {
  if (typeof value === 'string') return value;
  const record = asRecord(value);
  return record ? textOf(record.content) : '';
}

function firstString(value: unknown): string {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const text = textOf(entry);
      if (text) return text;
    }
    return '';
  }
  return textOf(value);
}

export function parseParams(raw: unknown, kind: ParamKind): ParamItem[] {
  if (!Array.isArray(raw)) return [];
  const params: ParamItem[] = [];
  for (const entry of raw) {
    const record = asRecord(entry);
    if (!record) continue;
    const key = textOf(record.key ?? record.name);
    const value = textOf(record.value);
    if (!key && !value) continue;
    const param: ParamItem = {
      key,
      value,
      enabled: record.disabled !== true,
      description: descriptionOf(record.description)
    };
    if (kind === 'formdata') {
      const isFile = record.type === 'file';
      param.type = isFile ? 'file' : 'text';
      if (isFile) param.filePath = firstString(record.src);
    }
    params.push(param);
  }
  return params;
}

export function parseScripts(raw: unknown): { preRequestScript: string; testScript: string } {
  let preRequestScript = '';
  let testScript = '';
  if (!Array.isArray(raw)) return { preRequestScript, testScript };
  for (const entry of raw) {
    const event = asRecord(entry);
    if (!event) continue;
    const listen = textOf(event.listen).toLowerCase();
    const script = asRecord(event.script);
    const exec = script?.exec;
    const code = Array.isArray(exec)
      ? exec.filter((line): line is string => typeof line === 'string').join('\n')
      : textOf(exec);
    if (listen === 'prerequest') preRequestScript = code;
    else if (listen === 'test') testScript = code;
  }
  return { preRequestScript, testScript };
}

function authValues(raw: unknown): Record<string, string> {
  const values: Record<string, string> = {};
  if (!Array.isArray(raw)) return values;
  for (const entry of raw) {
    const record = asRecord(entry);
    if (!record) continue;
    const key = textOf(record.key);
    if (key) values[key] = textOf(record.value);
  }
  return values;
}

function parseAuth(raw: unknown, warnings: string[]): AuthConfig {
  const auth = createEmptyAuth();
  const record = asRecord(raw);
  if (!record) return auth;
  const type = textOf(record.type).toLowerCase();
  if (type === 'basic') {
    const values = authValues(record.basic);
    return { ...auth, type: 'basic', basic: { username: values.username ?? '', password: values.password ?? '' } };
  }
  if (type === 'bearer') {
    return { ...auth, type: 'bearer', bearer: { token: authValues(record.bearer).token ?? '' } };
  }
  if (type === 'apikey') {
    const values = authValues(record.apikey);
    return {
      ...auth,
      type: 'apikey',
      apikey: { key: values.key ?? '', value: values.value ?? '', in: values.in === 'query' ? 'query' : 'header' }
    };
  }
  if (type && type !== 'noauth' && type !== 'inherit') {
    warnings.push(`Unsupported auth type "${type}" was imported as no auth.`);
  }
  return auth;
}

function assembleUrl(record: Record<string, unknown>): string {
  const protocol = textOf(record.protocol);
  const host = Array.isArray(record.host)
    ? record.host.map(textOf).filter(Boolean).join('.')
    : textOf(record.host);
  const path = Array.isArray(record.path)
    ? record.path.map(textOf).filter(Boolean).join('/')
    : textOf(record.path).replace(/^\/+/, '');
  let url = protocol ? `${protocol}://${host}` : host;
  if (path) url = `${url.replace(/\/+$/, '')}/${path}`;
  return url;
}

function parsePostmanUrl(raw: unknown): { url: string; queryParams: ParamItem[] } {
  if (typeof raw === 'string') {
    const parsed = parseUrl(raw);
    return { url: `${parsed.base}${parsed.hash}`, queryParams: parsed.params };
  }
  const record = asRecord(raw);
  if (!record) return { url: '', queryParams: [] };
  const fullUrl = textOf(record.raw) || assembleUrl(record);
  const parsed = parseUrl(fullUrl);
  const query = Array.isArray(record.query) ? parseParams(record.query, 'query') : [];
  return { url: `${parsed.base}${parsed.hash}`, queryParams: query.length > 0 ? query : parsed.params };
}

function parseBody(raw: unknown, warnings: string[]): RequestBody {
  const body = createEmptyBody();
  const record = asRecord(raw);
  if (!record || record.disabled === true) return body;
  const mode = textOf(record.mode).toLowerCase();
  if (mode === 'raw') {
    const rawValue = record.raw;
    const rawOptions = asRecord(asRecord(record.options)?.raw);
    const language = textOf(rawOptions?.language).toLowerCase();
    body.mode = 'raw';
    body.raw = typeof rawValue === 'string' ? rawValue : rawValue === undefined ? '' : JSON.stringify(rawValue);
    body.rawLanguage = language === 'json' ? 'json' : language === 'xml' ? 'xml' : 'text';
    return body;
  }
  if (mode === 'urlencoded') {
    body.mode = 'urlencoded';
    body.urlencoded = parseParams(record.urlencoded, 'urlencoded');
    return body;
  }
  if (mode === 'formdata') {
    body.mode = 'formdata';
    body.formdata = parseParams(record.formdata, 'formdata');
    return body;
  }
  if (mode === 'file') {
    body.mode = 'binary';
    body.binaryFilePath = firstString(asRecord(record.file)?.src);
    return body;
  }
  if (mode === 'graphql') {
    const graphql = asRecord(record.graphql);
    let variables: unknown = graphql?.variables;
    if (typeof variables === 'string') {
      if (!variables.trim()) variables = {};
      else {
        try {
          variables = JSON.parse(variables);
        } catch {
          // Keep the raw string when Postman stored non-JSON variables.
        }
      }
    }
    body.mode = 'raw';
    body.rawLanguage = 'json';
    body.raw = JSON.stringify({ query: textOf(graphql?.query), variables: variables ?? {} });
    return body;
  }
  if (mode && mode !== 'none') {
    warnings.push(`Unsupported body mode "${mode}" was imported as an empty body.`);
  }
  return body;
}

export function parseMethod(raw: unknown, warnings: string[]): RequestDefinition['method'] {
  const methodRaw = textOf(raw).toUpperCase();
  if (methodRaw && !(HTTP_METHODS as string[]).includes(methodRaw)) {
    warnings.push(`Unsupported HTTP method "${methodRaw}" was imported as GET.`);
  }
  return (HTTP_METHODS as string[]).includes(methodRaw)
    ? (methodRaw as RequestDefinition['method'])
    : 'GET';
}

export function parseRequestDefinition(
  item: Record<string, unknown>,
  name: string,
  warnings: string[]
): RequestDefinition {
  const requestRaw = item.request;
  const request = asRecord(requestRaw) ?? {};
  const method = parseMethod(request.method, warnings);
  const urlInfo = parsePostmanUrl(typeof requestRaw === 'string' ? requestRaw : request.url);
  return {
    name,
    method,
    url: urlInfo.url,
    queryParams: urlInfo.queryParams,
    headers: parseParams(request.header, 'header'),
    body: parseBody(request.body, warnings),
    preRequestScript: '',
    testScript: '',
    auth: parseAuth(request.auth, warnings)
  };
}
