/**
 * Minimal CONNECT tunnel negotiation. Returns the proxy/server response headers
 * without keeping the tunnel open (the engine is a request inspector, not a
 * general-purpose tunnel).
 */
import http from 'node:http';
import type { IncomingHttpHeaders } from 'node:http';
import { AppError } from '../utils/errors';

export interface ConnectResult {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: Record<string, string[]>;
  body: Buffer;
}

function normalize(headers: IncomingHttpHeaders): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    result[key.toLowerCase()] = Array.isArray(value) ? value.map(String) : [String(value)];
  }
  return result;
}

export function executeConnectTunnel(
  url: string,
  headers: Record<string, string>,
  timeoutMs: number,
  signal: AbortSignal
): Promise<ConnectResult> {
  return new Promise((resolve, reject) => {
    const target = new URL(url);
    let settled = false;
    const finish = (error: unknown, result?: ConnectResult): void => {
      if (settled) return;
      settled = true;
      if (error) reject(error);
      else resolve(result!);
    };
    const request = http.request({
      hostname: target.hostname,
      port: target.port || 80,
      method: 'CONNECT',
      path: `${target.hostname}:${target.port || 80}`,
      headers,
      timeout: timeoutMs
    });
    request.on('connect', (response, socket, head) => {
      const result: ConnectResult = {
        status: response.statusCode ?? 0,
        statusText: response.statusMessage ?? '',
        httpVersion: response.httpVersion,
        headers: normalize(response.headers),
        body: head ?? Buffer.alloc(0)
      };
      socket.destroy();
      finish(null, result);
    });
    request.on('timeout', () => {
      request.destroy();
      finish(new AppError('REQUEST_TIMEOUT', 'The request timed out'));
    });
    request.on('error', (error) => finish(new AppError('REQUEST_FAILED', error.message)));
    const onAbort = (): void => {
      request.destroy();
      finish(new AppError('REQUEST_CANCELLED', 'Request cancelled'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    request.end();
  });
}
