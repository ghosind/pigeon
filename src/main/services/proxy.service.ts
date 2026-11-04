/**
 * Resolves system/custom proxy settings into a Node HTTP agent.
 * The system resolver is injected so the service remains testable.
 */
import type { Agent } from 'node:http';
import { HttpProxyAgent } from 'http-proxy-agent';
import { HttpsProxyAgent } from 'https-proxy-agent';
import { SocksProxyAgent } from 'socks-proxy-agent';
import type { ProxyConfig } from '@shared/types';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('proxy');

export type SystemProxyResolver = (url: string) => Promise<string>;

function parseSystemResult(result: string): string | null {
  const first = result.split(';').map((part) => part.trim()).find(Boolean);
  if (!first) return null;
  if (/^DIRECT$/i.test(first)) return null;
  const match = /^(PROXY|HTTPS|SOCKS|SOCKS4|SOCKS5)\s+(.+)$/i.exec(first);
  if (!match) return null;
  const [, kind, host] = match;
  if (kind.toUpperCase() === 'SOCKS' || kind.toUpperCase() === 'SOCKS5') return `socks5://${host}`;
  if (kind.toUpperCase() === 'SOCKS4') return `socks4://${host}`;
  if (kind.toUpperCase() === 'HTTPS') return `https://${host}`;
  return `http://${host}`;
}

function normalizeCustomProxy(raw: string): string {
  const value = raw.trim();
  if (!value) throw new AppError('PROXY_ERROR', 'A custom proxy URL is required');
  if (/^(https?|socks4|socks5):\/\//i.test(value)) return value;
  return `http://${value}`;
}

export class ProxyService {
  constructor(private readonly resolveSystemProxy: SystemProxyResolver) {}

  async agentFor(targetUrl: string, config: ProxyConfig): Promise<Agent | undefined> {
    if (!config.enable) return undefined;
    let proxyUrl: string | null = null;
    if (config.mode === 'system') {
      try {
        proxyUrl = parseSystemResult(await this.resolveSystemProxy(targetUrl));
      } catch (error) {
        logger.warn('System proxy resolution failed', { error: String(error) });
        return undefined;
      }
    } else {
      proxyUrl = normalizeCustomProxy(config.customUrl ?? '');
    }
    if (!proxyUrl) return undefined;

    try {
      const parsed = new URL(proxyUrl);
      if (parsed.protocol === 'socks4:' || parsed.protocol === 'socks5:') {
        logger.info('Using SOCKS proxy', { protocol: parsed.protocol, host: parsed.host });
        return new SocksProxyAgent(proxyUrl);
      }
      const target = new URL(targetUrl);
      logger.info('Using HTTP proxy', { protocol: parsed.protocol, host: parsed.host, target: target.protocol });
      return target.protocol === 'https:'
        ? new HttpsProxyAgent(proxyUrl, { timeout: 15000 })
        : new HttpProxyAgent(proxyUrl, { timeout: 15000 });
    } catch (error) {
      throw new AppError('PROXY_ERROR', 'The proxy configuration is invalid', String(error));
    }
  }
}
