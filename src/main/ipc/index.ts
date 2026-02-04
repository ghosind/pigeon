import { IpcMain } from 'electron'
import { registerRequestHandlers } from './handlers/http'

export function registerIpcHandlers(ipc: IpcMain): void {
  registerRequestHandlers(ipc)
}
