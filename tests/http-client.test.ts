import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import http, { type Server } from 'node:http';
import { gzipSync } from 'node:zlib';
import { executeHttpRequest } from '../src/main/services/http-client';
import { AppError } from '../src/main/utils/errors';

let server: Server;
let baseUrl = '';

beforeAll(async () => {
  server = http.createServer((req, res) => {
    const url = req.url ?? '/';
    if (url.startsWith('/json')) {
      res.writeHead(200, { 'Content-Type': 'application/json', 'X-Test': 'one' });
      res.end(JSON.stringify({ ok: true, method: req.method }));
      return;
    }
    if (url === '/gzip') {
      res.writeHead(200, { 'Content-Type': 'text/plain', 'Content-Encoding': 'gzip' });
      res.end(gzipSync(Buffer.from('compressed body')));
      return;
    }
    if (url === '/redirect') {
      res.writeHead(302, { Location: '/json' });
      res.end();
      return;
    }
    if (url === '/large') {
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('x'.repeat(5000));
      return;
    }
    if (url === '/slow') return;
    if (url === '/echo') {
      const chunks: Buffer[] = [];
      req.on('data', (chunk: Buffer) => chunks.push(chunk));
      req.on('end', () => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ body: Buffer.concat(chunks).toString(), contentType: req.headers['content-type'] }));
      });
      return;
    }
    res.writeHead(404);
    res.end('nope');
  });
  server.on('connect', (_req, socket) => {
    socket.write('HTTP/1.1 200 Connection Established\r\nX-Tunnel: yes\r\n\r\n');
    socket.destroy();
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No server address');
  baseUrl = `http://127.0.0.1:${address.port}`;
});

afterAll(async () => {
  await new Promise<void>((resolve) => server.close(() => resolve()));
});

function spec(path: string, overrides: Partial<Parameters<typeof executeHttpRequest>[0]> = {}) {
  return {
    url: `${baseUrl}${path}`,
    method: 'GET',
    headers: { Accept: 'application/json' },
    timeoutMs: 3000,
    followRedirect: true,
    maxRedirects: 5,
    maxResponseSize: 1024 * 1024,
    ...overrides
  };
}

describe('http client', () => {
  it('performs a request and returns headers/body metadata', async () => {
    const response = await executeHttpRequest(spec('/json'));
    expect(response.status).toBe(200);
    expect(response.headers['content-type']?.[0]).toContain('application/json');
    expect(JSON.parse(response.body.toString())).toMatchObject({ ok: true, method: 'GET' });
    expect(response.requestHeaders.accept).toBe('application/json');
  });

  it('decompresses gzip responses', async () => {
    const response = await executeHttpRequest(spec('/gzip'));
    expect(response.body.toString()).toBe('compressed body');
    expect(response.size).toBe('compressed body'.length);
  });

  it('follows redirects and records hops', async () => {
    const response = await executeHttpRequest(spec('/redirect'));
    expect(response.status).toBe(200);
    expect(response.finalUrl).toBe(`${baseUrl}/json`);
    expect(response.redirects).toHaveLength(1);
  });

  it('does not follow redirects when disabled', async () => {
    const response = await executeHttpRequest(spec('/redirect', { followRedirect: false }));
    expect(response.status).toBe(302);
    expect(response.headers.location).toEqual(['/json']);
  });

  it('truncates bodies at the configured maximum', async () => {
    const response = await executeHttpRequest(spec('/large', { maxResponseSize: 100 }));
    expect(response.truncated).toBe(true);
    expect(response.size).toBe(100);
    expect(response.body).toHaveLength(100);
  });

  it('sends a body and content type', async () => {
    const response = await executeHttpRequest(
      spec('/echo', { method: 'POST', body: Buffer.from('hello'), headers: { 'Content-Type': 'text/plain' } })
    );
    expect(JSON.parse(response.body.toString())).toEqual({ body: 'hello', contentType: 'text/plain' });
  });

  it('negotiates CONNECT tunnels without hanging', async () => {
    const response = await executeHttpRequest(spec('/json', { method: 'CONNECT' }));
    expect(response.status).toBe(200);
    expect(response.headers['x-tunnel']).toEqual(['yes']);
  });

  it('times out slow requests', async () => {
    await expect(executeHttpRequest(spec('/slow', { timeoutMs: 80 }))).rejects.toMatchObject({ code: 'REQUEST_TIMEOUT' });
  });

  it('maps connection failures to a structured error', async () => {
    await expect(
      executeHttpRequest({
        ...spec('/json'),
        url: 'http://127.0.0.1:1/unreachable',
        timeoutMs: 500
      })
    ).rejects.toBeInstanceOf(AppError);
  });
});
