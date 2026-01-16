import { IpcMain } from 'electron'
import { RequestEngine } from '@main/network/requestEngine'
import { IPC_REQUEST_SEND, IPC_REQUEST_ABORT } from '@shared/constants/channels'
import { HTTPRequest } from '@shared/types/request'

const engine = new RequestEngine()

export function registerRequestHandlers(ipc: IpcMain): void {
  ipc.handle(IPC_REQUEST_SEND, async (_event, id: string, req: HTTPRequest) => {
    if (!req?.url || !req.method) {
      throw new Error('Invalid request')
    }
    return engine.send(id, req)
  })

  ipc.handle(IPC_REQUEST_ABORT, (_event, id: string) => {
    engine.abort(id)
  })
}
