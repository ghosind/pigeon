/**
 * Owns temporary response bodies. Only small previews cross IPC; full bodies are
 * paged from disk on demand and cleaned up automatically.
 */
import { randomUUID } from 'node:crypto';
import { mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import iconv from 'iconv-lite';
import type { ReadTextResult } from '@shared/ipc';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('body-store');
const INLINE_LIMIT = 1024 * 1024;
const PREVIEW_LIMIT = 64 * 1024;
const IMAGE_LIMIT = 2 * 1024 * 1024;
const MAX_CACHE_ENTRIES = 3;

export interface StoredBody {
  bodyId: string;
  isBinary: boolean;
  charset: string;
  bodyText?: string;
  bodyPreview?: string;
  bodyTextLength: number;
  imageDataUrl?: string;
}

interface BodyEntry {
  id: string;
  rawPath: string;
  textPath?: string;
  textLength: number;
  createdAt: number;
}

const TEXTUAL_MIME = [
  'application/json',
  'application/xml',
  'application/javascript',
  'application/x-www-form-urlencoded',
  'application/graphql',
  'application/yaml',
  'application/x-yaml',
  'application/problem+json',
  'application/ld+json',
  'image/svg+xml'
];

function parseCharset(contentType: string): string {
  const match = /charset\s*=\s*"?([^;"\s]+)"?/i.exec(contentType);
  const raw = match?.[1]?.toLowerCase() ?? 'utf-8';
  return iconv.encodingExists(raw) ? raw : 'utf-8';
}

function isTextual(contentType: string, body: Buffer): boolean {
  const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
  if (!mime) return looksLikeUtf8(body);
  if (mime.startsWith('text/') || TEXTUAL_MIME.includes(mime) || mime.endsWith('+json') || mime.endsWith('+xml')) {
    return true;
  }
  if (mime.startsWith('image/')) return false;
  return looksLikeUtf8(body);
}

function looksLikeUtf8(body: Buffer): boolean {
  if (body.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(body.subarray(0, Math.min(body.length, 256 * 1024)));
    return true;
  } catch {
    return false;
  }
}

export class BodyStore {
  private readonly dir: string;
  private readonly entries = new Map<string, BodyEntry>();
  private readonly textCache = new Map<string, string>();

  constructor(dataDir: string) {
    this.dir = path.join(dataDir, 'tmp', 'responses');
    mkdirSync(this.dir, { recursive: true });
    this.cleanup();
  }

  store(body: Buffer, contentType: string, _truncated: boolean): StoredBody {
    const id = randomUUID();
    const rawPath = path.join(this.dir, `${id}.bin`);
    writeFileSync(rawPath, body);
    const charset = parseCharset(contentType);
    const textual = isTextual(contentType, body);
    let bodyText = '';
    let textPath: string | undefined;
    let textLength = 0;
    if (textual) {
      try {
        bodyText = iconv.decode(body, charset);
      } catch {
        bodyText = body.toString('utf8');
      }
      textLength = bodyText.length;
      if (bodyText.length > INLINE_LIMIT) {
        textPath = path.join(this.dir, `${id}.txt`);
        writeFileSync(textPath, bodyText, 'utf8');
      }
    }
    const entry: BodyEntry = { id, rawPath, textPath, textLength, createdAt: Date.now() };
    this.entries.set(id, entry);
    let imageDataUrl: string | undefined;
    const mime = contentType.split(';')[0]?.trim().toLowerCase() ?? '';
    if (mime.startsWith('image/') && body.length <= IMAGE_LIMIT) {
      imageDataUrl = `data:${mime};base64,${body.toString('base64')}`;
    }
    return {
      bodyId: id,
      isBinary: !textual,
      charset,
      bodyText: textual && bodyText.length <= INLINE_LIMIT ? bodyText : undefined,
      bodyPreview: textual && bodyText.length > INLINE_LIMIT ? bodyText.slice(0, PREVIEW_LIMIT) : undefined,
      bodyTextLength: textLength,
      imageDataUrl
    };
  }

  /** Full decoded text for scripts; may be large. */
  fullText(bodyId: string): string {
    const entry = this.getEntry(bodyId);
    if (!entry.textPath) {
      return readFileSync(entry.rawPath, 'utf8');
    }
    return readFileSync(entry.textPath, 'utf8');
  }

  readText(bodyId: string, offset: number, length: number): ReadTextResult {
    const entry = this.getEntry(bodyId);
    if (!entry.textPath && entry.textLength === 0) {
      // Binary bodies are not pageable as text.
      if (entry.textLength === 0) throw new AppError('VALIDATION_ERROR', 'This response is binary');
    }
    let text = this.textCache.get(entry.id);
    if (text === undefined) {
      text = entry.textPath ? readFileSync(entry.textPath, 'utf8') : readFileSync(entry.rawPath, 'utf8');
      if (this.textCache.size >= MAX_CACHE_ENTRIES) {
        const oldest = this.textCache.keys().next().value;
        if (oldest) this.textCache.delete(oldest);
      }
      this.textCache.set(entry.id, text);
    }
    const start = Math.max(0, Math.min(offset, text.length));
    const slice = text.slice(start, start + Math.max(1, Math.min(length, 2 * 1024 * 1024)));
    return { text: slice, nextOffset: start + slice.length, totalLength: text.length };
  }

  pathFor(bodyId: string): string {
    return this.getEntry(bodyId).rawPath;
  }

  private getEntry(bodyId: string): BodyEntry {
    const entry = this.entries.get(bodyId);
    if (!entry) throw new AppError('NOT_FOUND', 'The response body is no longer available');
    return entry;
  }

  private cleanup(): void {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    try {
      for (const name of readdirSync(this.dir)) {
        const file = path.join(this.dir, name);
        try {
          if (statSync(file).mtimeMs < cutoff) unlinkSync(file);
        } catch {
          // Ignore files deleted concurrently.
        }
      }
    } catch (error) {
      logger.warn('Response temp cleanup failed', { error: String(error) });
    }
  }
}
