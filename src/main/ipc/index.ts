/**
 * IPC handler registration — aggregates all domain-specific handlers.
 */

import { IpcMain } from 'electron'
import { initSchema } from '../db/schema'
import { initDatabase } from '../db/sqlite'
import { registerRequestHandlers } from './handlers/http'
import { registerDialogHandlers } from './handlers/dialog'
import { registerDbHandlers } from './handlers/db'

export function registerIpcHandlers(ipc: IpcMain): void {
  // Initialize database and schema
  initDatabase()
  initSchema()

  console.log('[IPC] Database initialized, registering handlers...')

  registerRequestHandlers(ipc)
  registerDialogHandlers(ipc)
  registerDbHandlers(ipc)

  console.log('[IPC] All handlers registered')
}
