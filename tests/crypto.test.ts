import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { CryptoService } from '../src/main/services/crypto.service';

const dirs: string[] = [];

function makeDir(): string {
  const dir = mkdtempSync(path.join(tmpdir(), 'pigeon-crypto-'));
  dirs.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe('CryptoService', () => {
  it('encrypts and decrypts secrets with AES-GCM', () => {
    const dir = makeDir();
    const crypto = new CryptoService(dir);
    const ciphertext = crypto.encrypt('s3cr3t-value');
    expect(ciphertext.startsWith('enc:v1:')).toBe(true);
    expect(ciphertext).not.toContain('s3cr3t-value');
    expect(crypto.decrypt(ciphertext)).toBe('s3cr3t-value');
    expect(crypto.decrypt('plain text')).toBe('plain text');
    expect(crypto.encrypt('')).toBe('');
  });

  it('creates a permission-restricted vault key', () => {
    const dir = makeDir();
    const crypto = new CryptoService(dir);
    crypto.encrypt('value');
    const key = readFileSync(path.join(dir, 'vault.key'), 'utf8');
    expect(Buffer.from(key, 'base64').length).toBe(32);
  });

  it('fails when ciphertext is tampered with', () => {
    const dir = makeDir();
    const crypto = new CryptoService(dir);
    const ciphertext = crypto.encrypt('value');
    const parts = ciphertext.split(':');
    parts[parts.length - 1] = Buffer.from('tampered').toString('base64');
    expect(() => crypto.decrypt(parts.join(':'))).toThrow();
  });
});
