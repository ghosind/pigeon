import type { HttpMethod, ParamItem } from '@shared/types';

export function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  let value = bytes;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value >= 100 || index === 0 ? Math.round(value) : value.toFixed(1)} ${units[index]}`;
}

export function formatDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms < 0) return '—';
  if (ms < 1000) return `${Math.round(ms)} ms`;
  return `${(ms / 1000).toFixed(ms < 10000 ? 2 : 1)} s`;
}

export function formatClock(timestamp: number): string {
  return new Date(timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

export function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString([], {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function relativeDay(timestamp: number): string {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const sameDay = (a: Date, b: Date): boolean =>
    a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  if (sameDay(date, today)) return 'Today';
  if (sameDay(date, yesterday)) return 'Yesterday';
  return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

export function statusTone(status: number): 'success' | 'info' | 'warning' | 'danger' | 'muted' {
  if (status >= 200 && status < 300) return 'success';
  if (status >= 300 && status < 400) return 'info';
  if (status >= 400 && status < 500) return 'warning';
  if (status >= 500) return 'danger';
  return 'muted';
}

export function methodTone(method: HttpMethod | string): string {
  return `method-${String(method).toLowerCase()}`;
}

export function prettyJson(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function prettyXml(raw: string): string {
  const compact = raw.replace(/>\s*</g, '><').trim();
  let depth = 0;
  return compact
    .replace(/></g, '>\n<')
    .split('\n')
    .map((line) => {
      const trimmed = line.trim();
      if (trimmed.startsWith('</')) depth = Math.max(0, depth - 1);
      const padded = `${'  '.repeat(depth)}${trimmed}`;
      if (/^<[^!?/][^>]*[^/]>$/.test(trimmed) && !trimmed.includes('</')) depth += 1;
      return padded;
    })
    .join('\n');
}

export function detectLanguage(contentType: string, raw?: string): 'json' | 'xml' | 'html' | 'text' {
  const mime = contentType.split(';')[0]?.toLowerCase() ?? '';
  if (mime.includes('json')) return 'json';
  if (mime.includes('html')) return 'html';
  if (mime.includes('xml')) return 'xml';
  const sample = raw?.trimStart() ?? '';
  if (sample.startsWith('{') || sample.startsWith('[')) return 'json';
  if (sample.startsWith('<')) return 'xml';
  return 'text';
}

export function prettyBody(raw: string, language: 'json' | 'xml' | 'html' | 'text'): string {
  if (language === 'json') return prettyJson(raw);
  if (language === 'xml' || language === 'html') return prettyXml(raw);
  return raw;
}

export function truncate(value: string, max = 80): string {
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export function suggestFileName(url: string, contentType: string): string {
  let name = 'response';
  try {
    const parsed = new URL(url);
    const base = parsed.pathname.split('/').filter(Boolean).pop();
    if (base) name = base.replace(/[^\w.-]/g, '_');
  } catch {
    // Keep the default name.
  }
  if (name.includes('.')) return name;
  const mime = contentType.split(';')[0] ?? '';
  const extension =
    mime.includes('json') ? 'json'
    : mime.includes('html') ? 'html'
    : mime.includes('xml') ? 'xml'
    : mime.includes('css') ? 'css'
    : mime.includes('javascript') ? 'js'
    : mime.includes('png') ? 'png'
    : mime.includes('jpeg') ? 'jpg'
    : mime.includes('pdf') ? 'pdf'
    : 'txt';
  return `${name}.${extension}`;
}

export function enabledParams(params: ParamItem[]): ParamItem[] {
  return params.filter((param) => param.enabled && param.key.trim());
}

export function groupByDay<T extends { sentAt: number }>(items: T[]): Array<{ label: string; items: T[] }> {
  const groups: Array<{ label: string; items: T[] }> = [];
  for (const item of items) {
    const label = relativeDay(item.sentAt);
    const group = groups.find((entry) => entry.label === label);
    if (group) group.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}

export async function copyText(value: string): Promise<void> {
  await navigator.clipboard.writeText(value);
}
