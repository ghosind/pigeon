/**
 * Low-level HTTP engine. Intentionally independent of Electron so it can be
 * unit tested with a local server. Supports redirects, proxies, TLS material,
 * decompression, cancellation and bounded responses.
 */
import http, { type Agent, type IncomingHttpHeaders, type RequestOptions } from 'node:http';
import https from 'node:https';
import type { RedirectHop } from '@shared/types';
import { AppError } from '../utils/errors';
import { collectResponseBody } from './body-collector';
import { executeConnectTunnel } from './connect-request';
import type { TlsMaterial } from './ssl.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('http');

export interface HttpRequestSpec {
  url: string;
  method: string;
  headers: Record<string, string>;
  body?: Buffer;
  timeoutMs: number;
  followRedirect: boolean;
  maxRedirects: number;
  maxResponseSize: number;
  signal?: AbortSignal;
  tlsFactory?: (host: string) => TlsMaterial;
  agentFactory?: (url: string) => Promise<Agent | undefined>;
}

export interface HttpResponseData {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: Record<string, string[]>;
  body: Buffer;
  size: number;
  truncated: boolean;
  finalUrl: string;
  redirects: RedirectHop[];
  requestHeaders: Record<string, string>;
  durationMs: number;
}

const REDIRECT_CODES = new Set([301, 302, 303, 307, 308]);
const SSL_CODES = new Set([
  'UNABLE_TO_VERIFY_LEAF_SIGNATURE',
  'DEPTH_ZERO_SELF_SIGNED_CERT',
  'SELF_SIGNED_CERT_IN_CHAIN',
  'CERT_HAS_EXPIRED',
  'ERR_TLS_CERT_ALTNAME_INVALID',
  'ERR_SSL_WRONG_VERSION_NUMBER',
  'UNABLE_TO_GET_ISSUER_CERT_LOCALLY'
]);

function normalizeHeaders(headers: IncomingHttpHeaders): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    result[key.toLowerCase()] = Array.isArray(value) ? value.map(String) : [String(value)];
  }
  return result;
}

function firstHeader(headers: Record<string, string[]>, name: string): string {
  return headers[name.toLowerCase()]?.[0] ?? '';
}

function lowerCaseKeys(headers: Record<string, string>): Record<string, string> {
  const result: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (key.trim()) result[key.trim()] = value;
  }
  return result;
}

function bodylessStatus(status: number): boolean {
  return status === 204 || status === 304 || (status >= 100 && status < 200);
}

interface OnceResult {
  status: number;
  statusText: string;
  httpVersion: string;
  headers: Record<string, string[]>;
  body: Buffer;
  size: number;
  truncated: boolean;
  requestHeaders: Record<string, string>;
}

async function requestOnce(
  url: string,
  method: string,
  headers: Record<string, string>,
  body: Buffer | undefined,
  spec: HttpRequestSpec,
  signal: AbortSignal
): Promise<OnceResult> {
  const target = new URL(url);
  if (target.protocol !== 'http:' && target.protocol !== 'https:') {
    throw new AppError('REQUEST_FAILED', `Unsupported protocol: ${target.protocol}`);
  }
  if (spec.signal?.aborted) throw new AppError('REQUEST_CANCELLED', 'Request cancelled');

  const outgoing = lowerCaseKeys(headers);
  if (body && body.length > 0) {
    const hasLength = Object.keys(outgoing).some((key) => key.toLowerCase() === 'content-length');
    if (!hasLength) outgoing['Content-Length'] = String(body.length);
  }
  const agent = spec.agentFactory ? await spec.agentFactory(url) : undefined;
  const tls = target.protocol === 'https:' && spec.tlsFactory ? spec.tlsFactory(target.hostname) : undefined;
  const requestOptions: RequestOptions = {
    protocol: target.protocol,
    hostname: target.hostname,
    port: target.port || (target.protocol === 'https:' ? 443 : 80),
    path: `${target.pathname}${target.search}`,
    method,
    headers: outgoing,
    agent,
    ...(target.protocol === 'https:' ? tls ?? {} : {})
  };

  return new Promise<OnceResult>((resolve, reject) => {
    let settled = false;
    const onAbort = (): void => {
      request.destroy(new Error('aborted'));
    };
    const finish = (error: unknown, result?: OnceResult): void => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', onAbort);
      if (error) reject(error);
      else resolve(result!);
    };
    const transport = target.protocol === 'https:' ? https : http;
    const request = transport.request(requestOptions, (response) => {
      const responseHeaders = normalizeHeaders(response.headers);
      const requestHeaders: Record<string, string> = {};
      for (const [key, value] of Object.entries(request.getHeaders())) {
        if (value !== undefined) requestHeaders[key] = Array.isArray(value) ? value.join(', ') : String(value);
      }
      const status = response.statusCode ?? 0;
      if (bodylessStatus(status) || method === 'HEAD') {
        response.resume();
        finish(null, {
          status,
          statusText: response.statusMessage ?? '',
          httpVersion: response.httpVersion,
          headers: responseHeaders,
          body: Buffer.alloc(0),
          size: 0,
          truncated: false,
          requestHeaders
        });
        return;
      }
      collectResponseBody(response, spec.maxResponseSize, signal)
        .then((collected) =>
          finish(null, {
            status,
            statusText: response.statusMessage ?? '',
            httpVersion: response.httpVersion,
            headers: responseHeaders,
            body: collected.body,
            size: collected.size,
            truncated: collected.truncated,
            requestHeaders
          })
        )
        .catch((error) => finish(error));
    });

    request.on('error', (error) => finish(error));
    signal.addEventListener('abort', onAbort, { once: true });
    if (signal.aborted) {
      request.destroy(new Error('aborted'));
      return;
    }
    if (body && body.length > 0) request.write(body);
    request.end();
  });
}

function mapNetworkError(error: unknown, timedOut: boolean): AppError {
  if (error instanceof AppError) return error;
  const message = error instanceof Error ? error.message : String(error);
  if (timedOut) return new AppError('REQUEST_TIMEOUT', 'The request timed out', message);
  const code = typeof error === 'object' && error !== null && 'code' in error ? String((error as { code: unknown }).code) : '';
  if (code === 'ABORT_ERR' || message === 'aborted') {
    return new AppError('REQUEST_CANCELLED', 'Request cancelled');
  }
  if (SSL_CODES.has(code) || /certificate|ssl|tls/i.test(message)) {
    return new AppError('SSL_ERROR', 'TLS negotiation failed', message);
  }
  return new AppError('REQUEST_FAILED', message || 'The request failed', code || undefined);
}

export async function executeHttpRequest(spec: HttpRequestSpec): Promise<HttpResponseData> {
  const started = Date.now();
  const controller = new AbortController();
  let timedOut = false;
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, Math.max(1, spec.timeoutMs));
  const onOuterAbort = (): void => controller.abort();
  spec.signal?.addEventListener('abort', onOuterAbort, { once: true });

  let currentUrl = spec.url;
  let currentMethod = spec.method.toUpperCase();
  let currentBody = spec.body;
  let currentHeaders = { ...spec.headers };
  const redirects: RedirectHop[] = [];
  let lastRequestHeaders: Record<string, string> = {};

  try {
    for (let attempt = 0; attempt <= spec.maxRedirects; attempt += 1) {
      if (currentMethod === 'CONNECT') {
        const tunnel = await executeConnectTunnel(currentUrl, currentHeaders, spec.timeoutMs, controller.signal);
        return {
          status: tunnel.status,
          statusText: tunnel.statusText,
          httpVersion: tunnel.httpVersion,
          headers: tunnel.headers,
          body: tunnel.body,
          size: tunnel.body.length,
          truncated: false,
          finalUrl: currentUrl,
          redirects,
          requestHeaders: currentHeaders,
          durationMs: Date.now() - started
        };
      }
      const result = await requestOnce(
        currentUrl,
        currentMethod,
        currentHeaders,
        currentBody,
        spec,
        controller.signal
      );
      lastRequestHeaders = result.requestHeaders;
      const location = firstHeader(result.headers, 'location');
      if (!spec.followRedirect || !REDIRECT_CODES.has(result.status) || !location) {
        return {
          status: result.status,
          statusText: result.statusText,
          httpVersion: result.httpVersion,
          headers: result.headers,
          body: result.body,
          size: result.size,
          truncated: result.truncated,
          finalUrl: currentUrl,
          redirects,
          requestHeaders: lastRequestHeaders,
          durationMs: Date.now() - started
        };
      }
      if (attempt >= spec.maxRedirects) {
        throw new AppError('REQUEST_FAILED', `Too many redirects (max ${spec.maxRedirects})`);
      }
      const nextUrl = new URL(location, currentUrl).toString();
      redirects.push({ status: result.status, url: nextUrl });
      const nextOrigin = new URL(nextUrl).origin;
      const previousOrigin = new URL(currentUrl).origin;
      if (nextOrigin !== previousOrigin) {
        for (const key of Object.keys(currentHeaders)) {
          if (/^(authorization|cookie|proxy-authorization)$/i.test(key)) delete currentHeaders[key];
        }
      }
      if (result.status === 303 || ((result.status === 301 || result.status === 302) && currentMethod === 'POST')) {
        currentMethod = currentMethod === 'HEAD' ? 'HEAD' : 'GET';
        currentBody = undefined;
        for (const key of Object.keys(currentHeaders)) {
          if (/^content-(length|type)$/i.test(key)) delete currentHeaders[key];
        }
      }
      currentUrl = nextUrl;
      logger.debug('Following redirect', { status: result.status, url: nextUrl });
    }
    throw new AppError('REQUEST_FAILED', 'Too many redirects');
  } catch (error) {
    throw mapNetworkError(error, timedOut);
  } finally {
    clearTimeout(timeout);
    spec.signal?.removeEventListener('abort', onOuterAbort);
  }
}
