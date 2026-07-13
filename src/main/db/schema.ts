/**
 * Database schema — all table definitions, indexes, and column migration.
 *
 * This module defines the complete SQLite schema for the Pigeon API client.
 * It is idempotent: calling initSchema() will create tables only if they
 * don't already exist, and add missing columns for backward compatibility.
 *
 * Table list (19 tables):
 *  1. system_config      8. request_header      15. local_cookie
 *  2. environment        9. request_body        16. workspace
 *  3. env_variable      10. request_form_item   17. proxy_config
 *  4. collection        11. request_auth        18. client_cert
 *  5. collection_folder 12. request_setting     19. global_variable
 *  6. http_request      13. request_history
 *  7. request_param     14. request_test_script
 */

import { exec, run, get, all } from './sqlite'

// ---------------------------------------------------------------------------
// Table creation DDL
// ---------------------------------------------------------------------------

const DDL_STATEMENTS: string[] = [
  // 1. System configuration — single row (id=1)
  `CREATE TABLE IF NOT EXISTS system_config (
    id INTEGER PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    theme VARCHAR(20) NOT NULL DEFAULT 'system',
    language VARCHAR(10) NOT NULL DEFAULT 'en',
    font_size INTEGER NOT NULL DEFAULT 13,
    timeout INTEGER NOT NULL DEFAULT 30000,
    ignore_ssl INTEGER NOT NULL DEFAULT 0,
    enable_proxy INTEGER NOT NULL DEFAULT 0,
    proxy_url VARCHAR(500) DEFAULT '',
    history_retention INTEGER NOT NULL DEFAULT 30,
    layout_split_percent INTEGER DEFAULT 50,
    save_response_in_history INTEGER NOT NULL DEFAULT 1,
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
    workspace_id VARCHAR(36),
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    starred INTEGER NOT NULL DEFAULT 0,
    sort INTEGER NOT NULL DEFAULT 0,
    deleted INTEGER NOT NULL DEFAULT 0,
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    update_time TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
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
    workspace_id VARCHAR(36),
    method VARCHAR(10) NOT NULL,
    url TEXT NOT NULL,
    status_code INTEGER,
    cost_time INTEGER,
    request_full TEXT,
    response_full TEXT,
    deleted INTEGER NOT NULL DEFAULT 0,
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (workspace_id) REFERENCES workspace(id) ON DELETE CASCADE
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
  )`,

  // 16. Workspace — top-level organizational unit
  `CREATE TABLE IF NOT EXISTS workspace (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT DEFAULT '',
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    update_time TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 17. Proxy configuration
  `CREATE TABLE IF NOT EXISTS proxy_config (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    proxy_type VARCHAR(10) NOT NULL DEFAULT 'http',
    host VARCHAR(255) NOT NULL,
    port INTEGER NOT NULL DEFAULT 8080,
    username VARCHAR(255) DEFAULT '',
    password VARCHAR(500) DEFAULT '',
    is_active INTEGER NOT NULL DEFAULT 0,
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    update_time TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 18. Client certificate
  `CREATE TABLE IF NOT EXISTS client_cert (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    cert_path TEXT NOT NULL DEFAULT '',
    key_path TEXT DEFAULT '',
    password VARCHAR(500) DEFAULT '',
    create_time TEXT NOT NULL DEFAULT (datetime('now')),
    update_time TEXT NOT NULL DEFAULT (datetime('now'))
  )`,

  // 19. Global variables (shared across all workspaces)
  `CREATE TABLE IF NOT EXISTS global_variable (
    key VARCHAR(255) PRIMARY KEY,
    value TEXT NOT NULL DEFAULT '',
    description VARCHAR(500) DEFAULT '',
    enabled INTEGER NOT NULL DEFAULT 1,
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
  'CREATE INDEX IF NOT EXISTS idx_collection_workspace ON collection(workspace_id)',
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
  'CREATE INDEX IF NOT EXISTS idx_history_workspace ON request_history(workspace_id)',
  'CREATE INDEX IF NOT EXISTS idx_history_method ON request_history(method)',
  'CREATE INDEX IF NOT EXISTS idx_history_url ON request_history(url)',
  'CREATE INDEX IF NOT EXISTS idx_history_status ON request_history(status_code)',
  'CREATE INDEX IF NOT EXISTS idx_test_request ON request_test_script(request_id)',
  'CREATE INDEX IF NOT EXISTS idx_cookie_domain ON local_cookie(domain)',
  'CREATE INDEX IF NOT EXISTS idx_cookie_expire ON local_cookie(expire_time)',
  'CREATE INDEX IF NOT EXISTS idx_workspace_name ON workspace(name)',
  'CREATE INDEX IF NOT EXISTS idx_proxy_active ON proxy_config(is_active)',
  'CREATE INDEX IF NOT EXISTS idx_global_var_key ON global_variable(key)'
]

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialize the database schema. Creates all tables and indexes if they
 * don't already exist, and adds missing columns for backward compatibility.
 *
 * This function is idempotent and safe to call on every app startup.
 */
export function initSchema(): void {
  exec('PRAGMA journal_mode=WAL')
  exec('PRAGMA foreign_keys=ON')

  // Run all DDL (idempotent via IF NOT EXISTS)
  for (const ddl of DDL_STATEMENTS) {
    try {
      exec(ddl)
    } catch (err) {
      console.error('[DB] DDL failed:', (err as Error).message)
    }
  }

  for (const idxDdl of INDEX_STATEMENTS) {
    try {
      exec(idxDdl)
    } catch (err) {
      console.error('[DB] Index creation failed:', (err as Error).message)
    }
  }

  // Insert default system config if not present
  ensureDefaultConfig()

  // Ensure missing columns exist on existing databases (no-op if already present)
  ensureSystemConfigColumns()
  ensureWorkspaceColumns()
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

function ensureDefaultConfig(): void {
  const row = get('SELECT id FROM system_config WHERE id = 1') as { id: number } | undefined
  if (!row) {
    run(
      `INSERT OR IGNORE INTO system_config
        (id, theme, language, font_size, timeout, ignore_ssl, enable_proxy, proxy_url,
         history_retention, layout_split_percent, save_response_in_history)
       VALUES (1, 'system', 'en', 13, 30000, 0, 0, '', 30, 50, 1)`
    )
  }
}

/** Silently add missing columns to system_config for databases created before the column existed. */
function ensureSystemConfigColumns(): void {
  type ColInfo = { name: string }
  const columns = all<ColInfo>('PRAGMA table_info(system_config)').map((c) => c.name)

  const addColumn = (col: string, def: string): void => {
    if (!columns.includes(col)) {
      exec(`ALTER TABLE system_config ADD COLUMN ${col} ${def}`)
    }
  }

  addColumn('language', "VARCHAR(10) NOT NULL DEFAULT 'en'")
  addColumn('font_size', 'INTEGER NOT NULL DEFAULT 13')
  addColumn('save_response_in_history', 'INTEGER NOT NULL DEFAULT 1')
}

/** Add workspace_id to collection and request_history for existing databases. */
function ensureWorkspaceColumns(): void {
  type ColInfo = { name: string }

  try {
    const collCols = all<ColInfo>('PRAGMA table_info(collection)').map((c) => c.name)
    if (!collCols.includes('workspace_id')) {
      exec('ALTER TABLE collection ADD COLUMN workspace_id VARCHAR(36)')
      console.log('[DB] Migration: added workspace_id to collection')
    }
  } catch (err) {
    console.error('[DB] Migration: failed to add workspace_id to collection:', err)
  }

  try {
    const histCols = all<ColInfo>('PRAGMA table_info(request_history)').map((c) => c.name)
    if (!histCols.includes('workspace_id')) {
      exec('ALTER TABLE request_history ADD COLUMN workspace_id VARCHAR(36)')
      console.log('[DB] Migration: added workspace_id to request_history')
    }
  } catch (err) {
    console.error('[DB] Migration: failed to add workspace_id to request_history:', err)
  }
}
