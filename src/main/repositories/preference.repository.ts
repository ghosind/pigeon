import { defaultPreference } from '@shared/defaults';
import type { AppPreference } from '@shared/types';
import type { PigeonDatabase } from '../services/database';
import type { CryptoService } from '../services/crypto.service';
import { createLogger } from '../utils/logger';

const logger = createLogger('preferences');

function mergePreference(raw: unknown, dataDir: string): AppPreference {
  const defaults = defaultPreference(dataDir);
  if (!raw || typeof raw !== 'object') return defaults;
  const value = raw as Partial<AppPreference>;
  const language =
    value.language === 'en' || value.language === 'zh-CN' ? value.language : defaults.language;
  return {
    ...defaults,
    ...value,
    language,
    proxy: { ...defaults.proxy, ...(value.proxy ?? {}) },
    ssl: {
      ...defaults.ssl,
      ...(value.ssl ?? {}),
      caPaths: Array.isArray(value.ssl?.caPaths) ? value.ssl.caPaths : defaults.ssl.caPaths,
      clientCerts: Array.isArray(value.ssl?.clientCerts) ? value.ssl.clientCerts : defaults.ssl.clientCerts
    },
    shortcuts: { ...defaults.shortcuts, ...(value.shortcuts ?? {}) },
    dataDir
  };
}

export class PreferenceRepository {
  constructor(
    private readonly db: PigeonDatabase,
    private readonly dataDir: string,
    private readonly crypto: CryptoService
  ) {}

  get(): AppPreference {
    const row = this.db.prepare('SELECT value FROM preferences WHERE id = ?').get('app') as
      | { value: string }
      | undefined;
    if (!row) return defaultPreference(this.dataDir);
    try {
      return this.decryptPassphrases(mergePreference(JSON.parse(row.value), this.dataDir));
    } catch (error) {
      logger.warn('Preference JSON was malformed; using defaults', { error: String(error) });
      return defaultPreference(this.dataDir);
    }
  }

  save(preference: AppPreference): AppPreference {
    const sanitized = mergePreference(preference, this.dataDir);
    const persisted: AppPreference = {
      ...sanitized,
      ssl: {
        ...sanitized.ssl,
        clientCerts: sanitized.ssl.clientCerts.map((cert) => ({
          ...cert,
          passphrase: cert.passphrase ? this.crypto.encrypt(cert.passphrase) : undefined
        }))
      }
    };
    this.db
      .prepare(
        'INSERT INTO preferences (id, value) VALUES (?, ?) ON CONFLICT(id) DO UPDATE SET value = excluded.value'
      )
      .run('app', JSON.stringify(persisted));
    logger.info('Preferences saved', {
      theme: sanitized.theme,
      proxyEnabled: sanitized.proxy.enable,
      sslVerification: sanitized.ssl.rejectUnauthorized
    });
    return sanitized;
  }

  private decryptPassphrases(preference: AppPreference): AppPreference {
    return {
      ...preference,
      ssl: {
        ...preference.ssl,
        clientCerts: preference.ssl.clientCerts.map((cert) => {
          if (!cert.passphrase) return { ...cert, passphrase: undefined };
          try {
            return { ...cert, passphrase: this.crypto.decrypt(cert.passphrase) };
          } catch (error) {
            logger.warn('Unable to decrypt a client certificate passphrase', {
              host: cert.host,
              error: String(error)
            });
            return { ...cert, passphrase: undefined };
          }
        })
      }
    };
  }
}
