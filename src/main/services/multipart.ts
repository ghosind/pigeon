/** Builds multipart/form-data buffers without external runtime state. */
import { randomBytes } from 'node:crypto';
import { readFileSync, statSync } from 'node:fs';
import path from 'node:path';
import type { ParamItem } from '@shared/types';
import { AppError } from '../utils/errors';
import { mimeForPath } from '../utils/mime';
import { resolveTemplate, type VariableScopes } from '@shared/utils/variables';

const MAX_FILE_BYTES = 100 * 1024 * 1024;

function sanitize(value: string): string {
  return value.replace(/[\r\n"]/g, '_');
}

export interface MultipartResult {
  body: Buffer;
  contentType: string;
}

export function buildMultipart(rows: ParamItem[], scopes: VariableScopes): MultipartResult {
  const boundary = `----PigeonBoundary${randomBytes(12).toString('hex')}`;
  const segments: Buffer[] = [];
  for (const row of rows) {
    if (!row.enabled || !row.key.trim()) continue;
    const key = resolveTemplate(row.key, scopes).value;
    if (row.type === 'file') {
      const filePath = row.filePath ? resolveTemplate(row.filePath, scopes).value : '';
      if (!filePath) continue;
      let size = 0;
      try {
        size = statSync(filePath).size;
      } catch (error) {
        throw new AppError('IO_ERROR', `Unable to read upload file: ${path.basename(filePath)}`, String(error));
      }
      if (size > MAX_FILE_BYTES) {
        throw new AppError('VALIDATION_ERROR', `Upload file exceeds 100 MB: ${path.basename(filePath)}`);
      }
      let file: Buffer;
      try {
        file = readFileSync(filePath);
      } catch (error) {
        throw new AppError('IO_ERROR', `Unable to read upload file: ${path.basename(filePath)}`, String(error));
      }
      segments.push(
        Buffer.from(
          `--${boundary}\r\nContent-Disposition: form-data; name="${sanitize(key)}"; filename="${sanitize(path.basename(filePath))}"\r\nContent-Type: ${mimeForPath(filePath)}\r\n\r\n`,
          'utf8'
        ),
        file,
        Buffer.from('\r\n', 'utf8')
      );
      continue;
    }
    const value = resolveTemplate(row.value, scopes).value;
    segments.push(
      Buffer.from(
        `--${boundary}\r\nContent-Disposition: form-data; name="${sanitize(key)}"\r\n\r\n${value}\r\n`,
        'utf8'
      )
    );
  }
  segments.push(Buffer.from(`--${boundary}--\r\n`, 'utf8'));
  return { body: Buffer.concat(segments), contentType: `multipart/form-data; boundary=${boundary}` };
}
