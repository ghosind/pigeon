/**
 * SQLite database core — connection management and low-level query helpers.
 *
 * Provides a singleton database connection using better-sqlite3.
 * All higher-level data access should go through repositories, not raw queries.
 */

import fs from 'fs'
import path from 'path'
import os from 'os'
import SQLite, { Database } from 'better-sqlite3'

let db: Database | null = null
let dbFilePath: string | null = null

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

/** Ensure the parent directory exists for a given file path. */
function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

/**
 * Initialize (or return existing) database connection.
 * @param dbFile - optional custom path; defaults to ~/.pigeon/pigeon.sqlite
 * @returns the actual file path used
 */
export function initDatabase(dbFile?: string): string {
  if (db) {
    return dbFilePath!
  }

  const file = dbFile || path.join(os.homedir(), '.pigeon', 'pigeon.sqlite')
  ensureDir(file)
  db = new SQLite(file)
  dbFilePath = file

  // Performance & safety pragmas
  db.pragma('journal_mode=WAL')
  db.pragma('foreign_keys=ON')
  db.pragma('busy_timeout=5000')

  return file
}

/** Get the current database file path. Returns null if not initialized. */
export function getDatabasePath(): string | null {
  return dbFilePath
}

// ---------------------------------------------------------------------------
// Low-level query helpers
// ---------------------------------------------------------------------------

/** Execute a raw SQL statement (no params). */
export function exec(sql: string): void {
  if (!db) {
    initDatabase()
  }
  db!.exec(sql)
}

/** Run a parameterized SQL statement. Returns run result. */
export function run(sql: string, params?: unknown[]): SQLite.RunResult {
  if (!db) initDatabase()
  const stmt = db!.prepare(sql)
  return stmt.run(...(params || []))
}

/** Get a single row. Returns the row object or undefined. */
export function get<T = Record<string, unknown>>(sql: string, params?: unknown[]): T | undefined {
  if (!db) initDatabase()
  const stmt = db!.prepare(sql)
  return stmt.get(...(params || [])) as T | undefined
}

/** Get all matching rows. */
export function all<T = Record<string, unknown>>(sql: string, params?: unknown[]): T[] {
  if (!db) initDatabase()
  const stmt = db!.prepare(sql)
  return stmt.all(...(params || [])) as T[]
}

// ---------------------------------------------------------------------------
// Transaction helper
// ---------------------------------------------------------------------------

/**
 * Execute a callback within a transaction. If the callback throws,
 * the transaction is rolled back; otherwise it is committed.
 */
export function transaction<T>(fn: () => T): T {
  if (!db) initDatabase()
  exec('BEGIN TRANSACTION')
  try {
    const result = fn()
    exec('COMMIT')
    return result
  } catch (err) {
    exec('ROLLBACK')
    throw err
  }
}

// ---------------------------------------------------------------------------
// Lifecycle
// ---------------------------------------------------------------------------

/** Close the database connection gracefully. */
export function close(): void {
  if (db) {
    try {
      db.close()
    } catch (e) {
      console.error('[DB] Failed to close database:', e)
    }
    db = null
    dbFilePath = null
  }
}
