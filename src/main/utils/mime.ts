/** Minimal MIME lookup for uploads and response previews (offline, no network). */
const MIME_BY_EXTENSION: Record<string, string> = {
  json: 'application/json',
  xml: 'application/xml',
  txt: 'text/plain',
  html: 'text/html',
  css: 'text/css',
  js: 'text/javascript',
  ts: 'text/typescript',
  csv: 'text/csv',
  md: 'text/markdown',
  yaml: 'application/yaml',
  yml: 'application/yaml',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  pdf: 'application/pdf',
  zip: 'application/zip',
  gz: 'application/gzip',
  tar: 'application/x-tar',
  mp4: 'video/mp4',
  mp3: 'audio/mpeg',
  wav: 'audio/wav',
  bin: 'application/octet-stream'
};

export function mimeForPath(filePath: string): string {
  const extension = filePath.split('.').pop()?.toLowerCase() ?? '';
  return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
}

export function isTextMime(mime: string): boolean {
  const value = mime.split(';')[0]?.trim().toLowerCase() ?? '';
  return (
    value.startsWith('text/') ||
    value.includes('json') ||
    value.includes('xml') ||
    value === 'application/javascript' ||
    value === 'application/x-www-form-urlencoded' ||
    value === 'image/svg+xml'
  );
}
