/**
 * Database schema — all table definitions, indexes, and migration logic.
 *
 * This module defines the complete SQLite schema for the Pigeon API client.
 * It is idempotent: calling initSchema() will create tables only if they
 * don't already exist, and will run migrations for version upgrades.
 *
 * Table list (15 tables):
 *  1. system_config
 *  2. environment
 *  3. env_variable
 *  4. collection
 *  5. collection_folder
 *  6. http_request
 *  7. request_param
 *  8. request_header
 *  9. request_body
 * 10. request_form_item
 * 11. request_auth
 * 12. request_setting
 * 13. request_history
 * 14. request_test_script
 * 15. local_cookie
 */

import { exec, run, get } from './sqlite'

const CURRENT_SCHEMA_VERSION = 1

// ---------------------------------------------------------------------------
// Table creation DDL
// ---------------------------------------------------------------------------

const DDL_STATEMENTS: string[] = [
  // 1. System configuration — single row (id=1)
  `CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    theme VARCHAR(20) NOT NULL DEFAULT 'system',
    timeout INTEGER NOT NULL DEFAULT 30000,
    ignore_ssl INTEGER NOT NULL DEFAULT 0,
    enable_proxy INTEGER NOT NULL DEFAULT 0,
    proxy_url VARCHAR(500) DEFAULT '',
    history_retention INTEGER NOT NULL DEFAULT 30,
    layout_split_percent INTEGER DEFAULT 50,
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    update_time TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 2. Environment
  `CREATE TABLE IF NOT EXISTS environment (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    is_global INTEGER NOT NULL DEFAULT 0,
    is_active INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    update_time TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 3. Environment variable
  `CREATE TABLE IF NOT EXISTS env_variable (
    id VARCHAR(36) PRIMARY KEY,
    env_id VARCHAR(36) NOT NULL,
    key VARCHAR(255) NOT NULL,
    value TEXT NOT NULL DEFAULT '',
    description VARCHAR(500) DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    deleted INTEGER NOT NULL DEFAULT 0,
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    update_time TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (env_id) REFERENCES environment(id) ON DELETE CASCADE,
    UNIQUE(env_id, key)
  )`,

  // 4. Collection
  `CREATE TABLE IF NOT EXISTS collection (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    starred INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    update_time TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 5. Collection folder
  `CREATE TABLE IF NOT EXISTS collection_folder (
    id VARCHAR(36) PRIMARY KEY,
    collection_id VARCHAR(36) NOT NULL,
    parent_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    sort INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    update_time TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (collection_id) REFERENCES collection(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES collection_folder(id) ON DELETE SET NULL
  )`,

  // 6. HTTP request (core business table)
  `CREATE TABLE IF NOT EXISTS http_request (
    id VARCHAR(36) PRIMARY KEY,
    collection_id VARCHAR(36),
    folder_id VARCHAR(36),
    name VARCHAR(255) NOT NULL DEFAULT '',
    method VARCHAR(10) NOT NULL DEFAULT 'GET',
    url TEXT NOT NULL DEFAULT '',
    description TEXT DEFAULT '',
    starred INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    update_time TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (collection_id) REFERENCES collection(id) ON DELETE SET NULL,
    FOREIGN KEY (folder_id) REFERENCES collection_folder(id) ON DELETE SET NULL
  )`,

  // 7. Request param
  `CREATE TABLE IF NOT EXISTS request_param (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL,
    key VARCHAR(255) NOT NULL DEFAULT '',
    value TEXT NOT NULL DEFAULT '',
    description VARCHAR(500) DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (request_id) REFERENCES http_request(id) ON DELETE CASCADE
  )`,

  // 8. Request header
  `CREATE TABLE IF NOT EXISTS request_header (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL,
    key VARCHAR(255) NOT NULL DEFAULT '',
    value TEXT NOT NULL DEFAULT '',
    description VARCHAR(500) DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (request_id) REFERENCES http_request(id) ON DELETE CASCADE
  )`,

  // 9. Request body
  `CREATE TABLE IF NOT EXISTS request_body (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL UNIQUE,
    body_mode VARCHAR(20) NOT NULL DEFAULT 'none',
    raw_type VARCHAR(20) DEFAULT 'json',
    raw_content TEXT DEFAULT '',
    binary_path VARCHAR(1000) DEFAULT '',
    deleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (request_id) REFERENCES http_request(id) ON DELETE CASCADE
  )`,

  // 10. Request form item
  `CREATE TABLE IF NOT EXISTS request_form_item (
    id VARCHAR(36) PRIMARY KEY,
    body_id VARCHAR(36) NOT NULL,
    key VARCHAR(255) NOT NULL DEFAULT '',
    value TEXT NOT NULL DEFAULT '',
    file_path VARCHAR(1000) DEFAULT '',
    item_type VARCHAR(10) NOT NULL DEFAULT 'text',
    enabled INTEGER NOT NULL DEFAULT 1,
    sort INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (body_id) REFERENCES request_body(id) ON DELETE CASCADE
  )`,

  // 11. Request auth
  `CREATE TABLE IF NOT EXISTS request_auth (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL UNIQUE,
    auth_type VARCHAR(20) NOT NULL DEFAULT 'none',
    token TEXT DEFAULT '',
    username VARCHAR(255) DEFAULT '',
    password VARCHAR(500) DEFAULT '',
    api_key VARCHAR(255) DEFAULT '',
    api_value TEXT DEFAULT '',
    api_position VARCHAR(10) DEFAULT 'header',
    deleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (request_id) REFERENCES http_request(id) ON DELETE CASCADE
  )`,

  // 12. Request setting
  `CREATE TABLE IF NOT EXISTS request_setting (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL UNIQUE,
    timeout INTEGER NOT NULL DEFAULT 0,
    follow_redirect INTEGER NOT NULL DEFAULT 1,
    ignore_ssl INTEGER NOT NULL DEFAULT 0,
    use_proxy INTEGER NOT NULL DEFAULT 0,
    proxy_url VARCHAR(500) DEFAULT '',
    deleted INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (request_id) REFERENCES http_request(id) ON DELETE CASCADE
  )`,

  // 13. Request history
  `CREATE TABLE IF NOT EXISTS request_history (
    id VARCHAR(36) PRIMARY KEY,
    method VARCHAR(10) NOT NULL,
    url TEXT NOT NULL,
    status_code INTEGER,
    cost_time INTEGER,
    request_full TEXT,
    response_full TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    create_time TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 14. Test script
  `CREATE TABLE IF NOT EXISTS request_test_script (
    id VARCHAR(36) PRIMARY KEY,
    request_id VARCHAR(36) NOT NULL,
    script_content TEXT NOT NULL DEFAULT '',
    deleted INTEGER NOT NULL DEFAULT 0,
    update_time TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (request_id) REFERENCES http_request(id) ON DELETE CASCADE
  )`,

  // 15. Local cookie
  `CREATE TABLE IF NOT EXISTS local_cookie (
    id VARCHAR(36) PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    cookie_name VARCHAR(255) NOT NULL,
    cookie_value TEXT NOT NULL DEFAULT '',
    expire_time TEXT,
    path VARCHAR(500) DEFAULT '/',
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    update_time TEXT NOT NULL DEFAULT (datetime('now'))
  )`
]

// ---------------------------------------------------------------------------
// Index DDL
// ---------------------------------------------------------------------------

const INDEX_STATEMENTS: string[] = [
  'CREATE INDEX IF NOT EXISTS idx_env_name ON environment(name)',
  'CREATE INDEX IF NOT EXISTS idx_env_active ON environment(is_active)',
  'CREATE INDEX IF NOT EXISTS idx_env_var_env_id ON env_variable(env_id)',
  'CREATE INDEX IF NOT EXISTS idx_env_var_key ON env_variable(key)',
  'CREATE INDEX IF NOT EXISTS idx_collection_starred ON collection(starred)',
  'CREATE INDEX IF NOT EXISTS idx_folder_collection ON collection_folder(collection_id)',
  'CREATE INDEX IF NOT EXISTS idx_folder_parent ON collection_folder(parent_id)',
  'CREATE INDEX IF NOT EXISTS idx_request_collection ON http_request(collection_id)',
  'CREATE INDEX IF NOT EXISTS idx_request_folder ON http_request(folder_id)',
  'CREATE INDEX IF NOT EXISTS idx_request_method ON http_request(method)',
  'CREATE INDEX IF NOT EXISTS idx_request_url ON http_request(url)',
  'CREATE INDEX IF NOT EXISTS idx_request_starred ON http_request(starred)',
  'CREATE INDEX IF NOT EXISTS idx_param_request ON request_param(request_id)',
  'CREATE INDEX IF NOT EXISTS idx_header_request ON request_header(request_id)',
  'CREATE INDEX IF NOT EXISTS idx_form_item_body ON request_form_item(body_id)',
  'CREATE INDEX IF NOT EXISTS idx_history_time ON request_history(create_time DESC)',
  'CREATE INDEX IF NOT EXISTS idx_history_method ON request_history(method)',
  'CREATE INDEX IF NOT EXISTS idx_history_url ON request_history(url)',
  'CREATE INDEX IF NOT EXISTS idx_history_status ON request_history(status_code)',
  'CREATE INDEX IF NOT EXISTS idx_test_request ON request_test_script(request_id)',
  'CREATE INDEX IF NOT EXISTS idx_cookie_domain ON local_cookie(domain)',
  'CREATE INDEX IF NOT EXISTS idx_cookie_expire ON local_cookie(expire_time)'
]

// ---------------------------------------------------------------------------
// Schema version table
// ---------------------------------------------------------------------------

const VERSION_TABLE_DDL =
  "CREATE TABLE IF NOT EXISTS schema_version (version INTEGER PRIMARY KEY, applied_at TEXT NOT NULL DEFAULT (datetime('now')))"

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the database schema. Creates all tables and indexes if they
 * don't exist, and applies pending migrations.
 *
 * This function is idempotent and safe to call on every app startup.
 */
export function initSchema(): void {
  exec('PRAGMA journal_mode=WAL')
  exec('PRAGMA foreign_keys=ON')

  // Create version tracking table
  exec(VERSION_TABLE_DDL)

  const currentVersion = getCurrentSchemaVersion()

  // Run all DDL (idempotent via IF NOT EXISTS)
  for (const ddl of DDL_STATEMENTS) {
    exec(ddl)
  }

  for (const idxDdl of INDEX_STATEMENTS) {
    exec(idxDdl)
  }

  // Insert default system config if not present
  ensureDefaultConfig()

  // Apply migrations if needed
  if (currentVersion < CURRENT_SCHEMA_VERSION) {
    applyMigrations(currentVersion)
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function getCurrentSchemaVersion(): number {
  try {
    const row = get('SELECT MAX(version) as version FROM schema_version') as
      | { version: number | null }
      | undefined
    return row?.version ?? 0
  } catch {
    return 0
  }
}

function ensureDefaultConfig(): void {
  const row = get('SELECT id FROM system_config WHERE id = 1') as { id: number } | undefined
  if (!row) {
    run(
      `INSERT OR IGNORE INTO system_config (id, theme, timeout, ignore_ssl, enable_proxy, proxy_url, history_retention)
       VALUES (1, 'system', 30000, 0, 0, '', 30)`
    )
  }
}

/**
 * Apply pending schema migrations in order.
 * Each migration is identified by its target version number.
 */
function applyMigrations(fromVersion: number): void {
  // Migration v0 → v1: baseline, already handled by CREATE TABLE IF NOT EXISTS
  // Future migrations should check fromVersion to conditionally apply.
  if (fromVersion < CURRENT_SCHEMA_VERSION) {
    // Record that all migrations up to CURRENT_SCHEMA_VERSION are applied
    exec('BEGIN TRANSACTION')
    try {
      run('INSERT OR REPLACE INTO schema_version (version) VALUES (?)', [CURRENT_SCHEMA_VERSION])
      exec('COMMIT')
    } catch (err) {
      exec('ROLLBACK')
      throw err
    }
  }
}

/**
 * Get the current schema version for diagnostics.
 */
export function getSchemaVersion(): number {
  return getCurrentSchemaVersion()
}
