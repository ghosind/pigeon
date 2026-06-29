import { IpcMain } from 'electron'
import { RequestEngine } from '@main/network/requestEngine'
import { IPC_REQUEST_SEND, IPC_REQUEST_ABORT } from '@shared/constants/channels'
import { HTTPRequestConfig } from '@shared/types'

const engine = new RequestEngine()

const isNonEmptyString = (value: unknown): boolean => {
  return typeof value === 'string' && value.trim().length > 0
}

const isValidHttpRequest = (value: unknown): boolean => {
  if (typeof value !== 'object' || value == null) {
    return false
  }

  const req = value as HTTPRequestConfig
  return isNonEmptyString(req.url) && isNonEmptyString(req.method)
}

export function registerRequestHandlers(ipc: IpcMain): void {
  ipc.handle(IPC_REQUEST_SEND, async (_event, id: string, req: HTTPRequestConfig) => {
    if (!isNonEmptyString(id) || !isValidHttpRequest(req)) {
      throw new Error('Invalid request: id and url/method are required')
    }
    console.log(`[IPC] request:send — ${req.method} ${req.url}`)
    return engine.send(id, req)
  })

  ipc.handle(IPC_REQUEST_ABORT, (_event, id: string) => {
    if (isNonEmptyString(id)) {
      engine.abort(id)
    }
  })
}
