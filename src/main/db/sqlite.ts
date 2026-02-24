import fs from 'fs'
import path from 'path'
import os from 'os'
import SQLite, { Database } from 'better-sqlite3'

let db: Database | null = null

function ensureDir(filePath: string): void {
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
}

export function initDatabase(dbFile?: string): string {
  const file = dbFile || path.join(os.homedir(), '.pigeon', 'pigeon.sqlite')
  ensureDir(file)
  if (!db) {
    db = new SQLite(file)
  }
  return file
}

export function exec(sql: string): void {
  if (!db) {
    initDatabase()
  }
  db?.exec(sql)
}

export function run(sql: string, params?: unknown[]): SQLite.RunResult | undefined {
  if (!db) initDatabase()
  const stmt = db?.prepare(sql)
  return stmt?.run(params || [])
}

export function get(sql: string, params?: unknown[]): SQLite.RunResult | undefined {
  if (!db) initDatabase()
  const stmt = db?.prepare(sql)
  return stmt?.get(params || []) as SQLite.RunResult
}

export function all<T = unknown>(sql: string, params?: unknown[]): T[] {
  if (!db) initDatabase()
  const stmt = db?.prepare(sql)
  return stmt?.all(params || []) as T[]
}

export function close(): void {
  if (db) {
    try {
      db.close()
    } catch (e) {
      console.error('Failed to close database:', e)
    }
    db = null
  }
}
