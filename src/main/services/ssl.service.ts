/**
 * Loads CA bundles and client certificates from disk, matching client certs by
 * request host (supports a leading wildcard such as *.example.com).
 */
import { readFileSync, statSync } from 'node:fs';
import type { ClientCertItem, SSLConfig } from '@shared/types';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('ssl');

export interface TlsMaterial {
  rejectUnauthorized: boolean;
  ca?: Buffer[];
  cert?: Buffer;
  key?: Buffer;
  pfx?: Buffer;
  passphrase?: string;
}

interface CacheEntry {
  mtimeMs: number;
  data: Buffer;
}

function hostMatches(pattern: string, host: string): boolean {
  const target = host.toLowerCase().replace(/:\d+$/, '');
  const rule = pattern.toLowerCase().replace(/:\d+$/, '').trim();
  if (!rule) return false;
  if (rule === target) return true;
  if (rule.startsWith('*.')) return target.endsWith(rule.slice(1)) && target.split('.').length >= rule.split('.').length;
  return false;
}

export class SslService {
  private readonly cache = new Map<string, CacheEntry>();

  private read(path: string): Buffer {
    try {
      const info = statSync(path);
      const cached = this.cache.get(path);
      if (cached && cached.mtimeMs === info.mtimeMs) return cached.data;
      const data = readFileSync(path);
      this.cache.set(path, { mtimeMs: info.mtimeMs, data });
      return data;
    } catch (error) {
      throw new AppError('SSL_ERROR', `Unable to read certificate file: ${path}`, String(error));
    }
  }

  materialFor(host: string, config: SSLConfig): TlsMaterial {
    const material: TlsMaterial = { rejectUnauthorized: config.rejectUnauthorized };
    if (config.caPaths.length > 0) {
      material.ca = config.caPaths.filter(Boolean).map((path) => this.read(path));
    }
    const cert = config.clientCerts.find((item) => hostMatches(item.host, host));
    if (cert) this.applyClientCert(material, cert);
    return material;
  }

  private applyClientCert(material: TlsMaterial, cert: ClientCertItem): void {
    if (cert.kind === 'pfx') {
      material.pfx = this.read(cert.certPath);
      if (cert.passphrase) material.passphrase = cert.passphrase;
      logger.info('Applied PFX client certificate', { host: cert.host });
      return;
    }
    material.cert = this.read(cert.certPath);
    if (!cert.keyPath) throw new AppError('SSL_ERROR', 'A PEM client certificate requires a private key');
    material.key = this.read(cert.keyPath);
    if (cert.passphrase) material.passphrase = cert.passphrase;
    logger.info('Applied PEM client certificate', { host: cert.host });
  }
}
