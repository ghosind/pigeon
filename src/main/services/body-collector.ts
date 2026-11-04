/**
 * Collects a response stream with a hard decompressed-size ceiling. Stops early
 * and reports `truncated` instead of exhausting memory on runaway responses.
 */
import type { IncomingMessage } from 'node:http';
import { createBrotliDecompress, createGunzip, createInflate } from 'node:zlib';
import type { Readable, Transform } from 'node:stream';

export interface CollectedBody {
  body: Buffer;
  size: number;
  truncated: boolean;
}

function decoderFor(encoding: string): Transform | null {
  const value = encoding.toLowerCase().trim();
  if (!value || value === 'identity') return null;
  if (value.includes('gzip') || value.includes('x-gzip')) return createGunzip();
  if (value.includes('br')) return createBrotliDecompress();
  if (value.includes('deflate')) return createInflate();
  return null;
}

export function collectResponseBody(
  response: IncomingMessage,
  maxBytes: number,
  signal?: AbortSignal
): Promise<CollectedBody> {
  const encoding = String(response.headers['content-encoding'] ?? '');
  const decoder = decoderFor(encoding);
  const stream = (decoder ? response.pipe(decoder) : response) as unknown as Readable;
  const chunks: Buffer[] = [];
  let size = 0;
  let truncated = false;

  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (result: CollectedBody): void => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      resolve(result);
    };
    const fail = (error: unknown): void => {
      if (settled) return;
      settled = true;
      signal?.removeEventListener('abort', onAbort);
      reject(error);
    };
    const onAbort = (): void => {
      response.destroy();
      decoder?.destroy();
      fail(new Error('aborted'));
    };
    if (signal?.aborted) {
      onAbort();
      return;
    }
    signal?.addEventListener('abort', onAbort, { once: true });

    stream.on('data', (chunk: Buffer) => {
      if (settled) return;
      const remaining = maxBytes - size;
      if (remaining <= 0) {
        truncated = true;
        finish({ body: Buffer.concat(chunks), size, truncated });
        response.destroy();
        decoder?.destroy();
        return;
      }
      if (chunk.length > remaining) {
        chunks.push(chunk.subarray(0, remaining));
        size += remaining;
        truncated = true;
        finish({ body: Buffer.concat(chunks), size, truncated });
        response.destroy();
        decoder?.destroy();
        return;
      }
      chunks.push(chunk);
      size += chunk.length;
    });
    stream.on('end', () => finish({ body: Buffer.concat(chunks), size, truncated }));
    stream.on('error', (error) => {
      if (truncated) return finish({ body: Buffer.concat(chunks), size, truncated });
      fail(error);
    });
    response.on('aborted', () => fail(new Error('aborted')));
  });
}
