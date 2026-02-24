import { IpcMain } from 'electron'
import { registerRequestHandlers } from './handlers/http'
import { registerDialogHandlers } from './handlers/dialog'
import { registerDbHandlers } from './handlers/db'

export function registerIpcHandlers(ipc: IpcMain): void {
  registerRequestHandlers(ipc)
  registerDialogHandlers(ipc)
  registerDbHandlers(ipc)
}
