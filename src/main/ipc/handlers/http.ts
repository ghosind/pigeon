import { IpcMain } from 'electron'
import { RequestEngine } from '@main/network/requestEngine'
import { IPC_REQUEST_SEND, IPC_REQUEST_ABORT } from '@shared/constants/channels'
import { HTTPRequest } from '@shared/types/http'

const engine = new RequestEngine()

const isNonEmptyString = (value: unknown): boolean => {
  return typeof value === 'string' && value.trim().length > 0
}

const isValidHttpRequest = (value: unknown): boolean => {
  if (typeof value !== 'object' || value == null) {
    return false
  }

  const req = value as HTTPRequest
  return isNonEmptyString(req.url) && isNonEmptyString(req.method)
}

export function registerRequestHandlers(ipc: IpcMain): void {
  ipc.handle(IPC_REQUEST_SEND, async (_event, id: string, req: HTTPRequest) => {
    if (!isNonEmptyString(id) || !isValidHttpRequest(req)) {
      throw new Error('Invalid request')
    }
    return engine.send(id, req)
  })

  ipc.handle(IPC_REQUEST_ABORT, (_event, id: string) => {
    if (isNonEmptyString(id)) {
      engine.abort(id)
    }
  })
}
