/**
 * Lightweight leveled logger. Messages are redacted and appended to a rotating
 * log file inside the app data directory. Never log request bodies or secrets.
 */
import { appendFile, mkdir, rename, stat } from 'node:fs/promises';
import path from 'node:path';

export type LogLevel = 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';

const REDACTED_KEYS = /password|passphrase|token|secret|authorization|cookie|api[-_]?key/i;
const MAX_LOG_BYTES = 5 * 1024 * 1024;

let logFile: string | null = null;
let writeQueue: Promise<void> = Promise.resolve();

function redact(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      result[key] = REDACTED_KEYS.test(key) ? '[REDACTED]' : redact(inner);
    }
    return result;
  }
  return value;
}

export async function initializeLogger(dataDir: string): Promise<void> {
  const dir = path.join(dataDir, 'logs');
  await mkdir(dir, { recursive: true });
  const file = path.join(dir, 'pigeon.log');
  try {
    const info = await stat(file);
    if (info.size > MAX_LOG_BYTES) {
      await rename(file, path.join(dir, `pigeon-${Date.now()}.log`)).catch(() => undefined);
    }
  } catch {
    // File does not exist yet.
  }
  logFile = file;
}

function serialize(message: string, meta?: unknown): string {
  const suffix = meta === undefined ? '' : ` ${JSON.stringify(redact(meta))}`;
  return `${message}${suffix}`;
}

function write(level: LogLevel, scope: string, message: string, meta?: unknown): void {
  const line = `${new Date().toISOString()} ${level.padEnd(5)} [${scope}] ${serialize(message, meta)}\n`;
  if (level === 'ERROR') console.error(line.trimEnd());
  else if (level === 'WARN') console.warn(line.trimEnd());
  else if (process.env.NODE_ENV !== 'production') console.log(line.trimEnd());

  if (!logFile) return;
  const target = logFile;
  writeQueue = writeQueue
    .then(() => appendFile(target, line, 'utf8'))
    .catch(() => undefined);
}

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
}

export function createLogger(scope: string): Logger {
  return {
    debug: (message, meta) => write('DEBUG', scope, message, meta),
    info: (message, meta) => write('INFO', scope, message, meta),
    warn: (message, meta) => write('WARN', scope, message, meta),
    error: (message, meta) => write('ERROR', scope, message, meta)
  };
}

export async function flushLogs(): Promise<void> {
  await writeQueue;
}
