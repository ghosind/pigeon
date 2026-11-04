/**
 * Resolves the active storage directory (portable / env / config / userData)
 * and persists the user's preference for the next launch.
 */
import { app } from 'electron';
import { copyFile, mkdir, readFile, rename, rm, stat, writeFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import type { PigeonDatabase } from './database';

const logger = createLogger('data-dir');

export interface DataDirState {
  dir: string;
  defaultUserData: string;
  portable: boolean;
  overridden: boolean;
  configPath: string;
}

let state: DataDirState | null = null;

function cliDataDir(): string | null {
  const arg = process.argv.find((value) => value.startsWith('--data-dir='));
  return arg ? arg.slice('--data-dir='.length) : null;
}

async function readConfiguredDir(configPath: string): Promise<string | null> {
  try {
    const raw = JSON.parse(await readFile(configPath, 'utf8')) as { dataDir?: unknown };
    return typeof raw.dataDir === 'string' && raw.dataDir.trim() ? raw.dataDir : null;
  } catch {
    return null;
  }
}

export async function initializeDataDirectory(): Promise<DataDirState> {
  const defaultUserData = app.getPath('userData');
  const configPath = path.join(defaultUserData, 'pigeon-config.json');
  const portable = app.isPackaged && existsSync(path.join(path.dirname(process.execPath), 'portable'));
  const envOverride = process.env.PIGEON_DATA_DIR?.trim();
  const cliOverride = cliDataDir();
  let dir = defaultUserData;
  let overridden = false;

  if (portable) {
    dir = path.join(path.dirname(process.execPath), 'data');
    overridden = true;
  } else if (envOverride) {
    dir = path.resolve(envOverride);
    overridden = true;
  } else if (cliOverride) {
    dir = path.resolve(cliOverride);
    overridden = true;
  } else {
    const configured = await readConfiguredDir(configPath);
    if (configured) dir = path.resolve(configured);
  }
  await mkdir(dir, { recursive: true });
  state = { dir, defaultUserData, portable, overridden, configPath };
  logger.info('Data directory resolved', { dir, portable, overridden });
  return state;
}

export function dataDirState(): DataDirState {
  if (!state) throw new AppError('UNKNOWN', 'Data directory has not been initialized');
  return state;
}

export async function ensureWritableDirectory(target: string): Promise<void> {
  try {
    await mkdir(target, { recursive: true });
    const probe = path.join(target, `.pigeon-write-test-${Date.now()}`);
    await writeFile(probe, 'ok', 'utf8');
    await rm(probe, { force: true });
  } catch (error) {
    throw new AppError('IO_ERROR', 'The selected folder is not writable', String(error));
  }
}

/**
 * Creates a consistent database snapshot in the new directory using VACUUM INTO,
 * copies the vault key, and records the choice for the next launch.
 */
export async function migrateDataDirectory(
  target: string,
  database: PigeonDatabase,
  currentDir: string
): Promise<void> {
  const current = dataDirState();
  if (current.portable) {
    throw new AppError('VALIDATION_ERROR', 'The data folder cannot be changed in portable mode');
  }
  if (current.overridden) {
    throw new AppError('VALIDATION_ERROR', 'The data folder is fixed by the PIGEON_DATA_DIR or --data-dir override');
  }
  const destination = path.resolve(target);
  if (destination === path.resolve(currentDir)) {
    throw new AppError('VALIDATION_ERROR', 'The new folder is already in use');
  }
  await ensureWritableDirectory(destination);
  const tempDatabase = path.join(destination, `pigeon-${Date.now()}.db.tmp`);
  const escaped = tempDatabase.replace(/'/g, "''");
  try {
    database.handle.exec(`VACUUM INTO '${escaped}'`);
    const targetDatabase = path.join(destination, 'pigeon.db');
    if (existsSync(targetDatabase)) {
      const backupName = path.join(destination, `pigeon-backup-${Date.now()}.db`);
      await rename(targetDatabase, backupName);
      logger.info('Existing database moved aside', { backupName });
    }
    await rename(tempDatabase, targetDatabase);
    const keySource = path.join(currentDir, 'vault.key');
    if (existsSync(keySource)) {
      await copyFile(keySource, path.join(destination, 'vault.key'));
    }
    await writeFile(current.configPath, JSON.stringify({ dataDir: destination }, null, 2), 'utf8');
    logger.info('Data directory migrated', { destination });
  } catch (error) {
    await rm(tempDatabase, { force: true }).catch(() => undefined);
    if (error instanceof AppError) throw error;
    throw new AppError('IO_ERROR', 'Unable to move the data folder', String(error));
  }
}

export async function dataDirectorySize(dir: string): Promise<number> {
  try {
    const info = await stat(dir);
    return info.size;
  } catch {
    return 0;
  }
}
