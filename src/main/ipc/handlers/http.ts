import { IpcMain } from 'electron'
import { RequestEngine } from '@main/network/requestEngine'
import { IPC_REQUEST_SEND, IPC_REQUEST_ABORT } from '../channels'
import { Request } from '@shared/types/request'

const engine = new RequestEngine()

export function registerRequestHandlers(ipc: IpcMain): void {
  ipc.handle(IPC_REQUEST_SEND, async (_event, req: Request) => {
    if (!req?.url || !req.method) {
      throw new Error('Invalid request')
    }
    return engine.send(req)
  })

  ipc.handle(IPC_REQUEST_ABORT, (_event, id: string) => {
    engine.abort(id)
  })
}
