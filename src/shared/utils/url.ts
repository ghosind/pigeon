/**
 * URL <-> query-row helpers. Kept dependency-free so they can be unit tested.
 */
import type { ParamItem } from '../types';

const TEMPLATE_TOKEN = /(\{\{[^{}]+\}\})/g;

export interface ParsedUrl {
  /** Everything before `?`, including the hash-free path. */
  base: string;
  params: ParamItem[];
  hash: string;
}

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, ' '));
  } catch {
    return value;
  }
}

/** Encodes a query component but leaves `{{variable}}` placeholders intact. */
export function encodeQueryComponent(value: string): string {
  return value
    .split(TEMPLATE_TOKEN)
    .map((part) => (part.startsWith('{{') ? part : encodeURIComponent(part)))
    .join('');
}

/** Parses the raw URL into base + editable query rows, preserving order. */
export function parseUrl(rawUrl: string): ParsedUrl {
  let rest = rawUrl.trim();
  let hash = '';
  const hashIndex = rest.indexOf('#');
  if (hashIndex >= 0) {
    hash = rest.slice(hashIndex);
    rest = rest.slice(0, hashIndex);
  }
  const queryIndex = rest.indexOf('?');
  if (queryIndex < 0) {
    return { base: rest, params: [], hash };
  }
  const base = rest.slice(0, queryIndex);
  const query = rest.slice(queryIndex + 1);
  const params: ParamItem[] = [];
  for (const segment of query.split('&')) {
    if (!segment) continue;
    const equalsIndex = segment.indexOf('=');
    const rawKey = equalsIndex >= 0 ? segment.slice(0, equalsIndex) : segment;
    const rawValue = equalsIndex >= 0 ? segment.slice(equalsIndex + 1) : '';
    params.push({
      key: safeDecode(rawKey),
      value: safeDecode(rawValue),
      enabled: true,
      description: ''
    });
  }
  return { base, params, hash };
}

/** Rebuilds the URL from the base + enabled query rows. */
export function buildUrl(rawUrl: string, params: ParamItem[]): string {
  const parsed = parseUrl(rawUrl);
  const pairs = params
    .filter((param) => param.enabled && param.key.trim().length > 0)
    .map((param) => `${encodeQueryComponent(param.key)}=${encodeQueryComponent(param.value)}`);
  const query = pairs.length > 0 ? `?${pairs.join('&')}` : '';
  return `${parsed.base}${query}${parsed.hash}`;
}

/** Parses a typed URL and returns the query rows that should populate the form. */
export function queryRowsFromUrl(rawUrl: string): ParamItem[] {
  return parseUrl(rawUrl).params;
}

/** Ensures a scheme is present; defaults to http for local/intranet hosts. */
export function normalizeUrl(rawUrl: string): string {
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';
  if (/^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//.test(trimmed)) return trimmed;
  if (/^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])(?::|\/|$)/i.test(trimmed)) {
    return `http://${trimmed}`;
  }
  return `https://${trimmed}`;
}

export function stripHash(url: string): string {
  const index = url.indexOf('#');
  return index >= 0 ? url.slice(0, index) : url;
}

export function addQueryParam(rawUrl: string, key: string, value: string): string {
  const parsed = parseUrl(rawUrl);
  return buildUrl(rawUrl, [
    ...parsed.params,
    { key, value, enabled: true, description: '' }
  ]);
}

export function getOrigin(rawUrl: string): string {
  try {
    return new URL(rawUrl).origin;
  } catch {
    return '';
  }
}

/** Turns a URL into a compact label, leaving room for the host. */
export function shortenUrl(rawUrl: string, maxLength = 72): string {
  if (rawUrl.length <= maxLength) return rawUrl;
  try {
    const parsed = new URL(rawUrl);
    const pathLabel = `${parsed.pathname}${parsed.search}`;
    return `${parsed.host}${pathLabel.length > maxLength - parsed.host.length ? '…' : pathLabel}`;
  } catch {
    return `${rawUrl.slice(0, maxLength)}…`;
  }
}
