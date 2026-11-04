/**
 * AES-256-GCM encryption for secret variables. The local vault seed lives in a
 * separate file from the database and is bound to the local machine identity.
 */
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'node:crypto';
import { chmodSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { AppError } from '../utils/errors';

const PREFIX = 'enc:v1:';
const IV_BYTES = 12;

export class CryptoService {
  private key: Buffer | null = null;
  private readonly keyPath: string;

  constructor(private readonly dataDir: string) {
    this.keyPath = path.join(dataDir, 'vault.key');
  }

  private machineFingerprint(): string {
    let username = 'user';
    try {
      username = os.userInfo().username;
    } catch {
      // Fall back to a stable default in restricted environments.
    }
    return `${os.hostname()}|${username}|pigeon-api-studio`;
  }

  private loadKey(): Buffer {
    if (this.key) return this.key;
    mkdirSync(this.dataDir, { recursive: true });
    let seed: Buffer;
    try {
      seed = Buffer.from(readFileSync(this.keyPath, 'utf8').trim(), 'base64');
    } catch {
      seed = randomBytes(32);
      writeFileSync(this.keyPath, seed.toString('base64'), { encoding: 'utf8', mode: 0o600 });
      chmodSync(this.keyPath, 0o600);
    }
    if (seed.length < 16) {
      throw new AppError('DATABASE_ERROR', 'The local encryption key is corrupted');
    }
    const derived = hkdfSync('sha256', seed, this.machineFingerprint(), 'pigeon-vault-v1', 32);
    this.key = Buffer.from(derived);
    return this.key;
  }

  isEncrypted(value: string): boolean {
    return value.startsWith(PREFIX);
  }

  encrypt(plaintext: string): string {
    if (!plaintext) return '';
    if (this.isEncrypted(plaintext)) return plaintext;
    const key = this.loadKey();
    const iv = randomBytes(IV_BYTES);
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
  }

  decrypt(payload: string): string {
    if (!payload) return '';
    if (!this.isEncrypted(payload)) return payload;
    const body = payload.slice(PREFIX.length);
    const [ivPart, tagPart, cipherPart] = body.split(':');
    if (!ivPart || !tagPart || !cipherPart) {
      throw new AppError('DATABASE_ERROR', 'A stored secret is malformed');
    }
    try {
      const key = this.loadKey();
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(ivPart, 'base64'));
      decipher.setAuthTag(Buffer.from(tagPart, 'base64'));
      return Buffer.concat([
        decipher.update(Buffer.from(cipherPart, 'base64')),
        decipher.final()
      ]).toString('utf8');
    } catch (error) {
      throw new AppError(
        'DATABASE_ERROR',
        'Unable to decrypt a stored secret on this machine',
        error instanceof Error ? error.message : undefined
      );
    }
  }
}
