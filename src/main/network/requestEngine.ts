import { HTTPRequest, HTTPResponse } from '@shared/types'
import { InterceptorManager } from './interceptor'
import { sendHttpRequest } from './httpClient'

const DEFAULT_TIMEOUT_MS = 15000

export class RequestEngine {
  private interceptors = new InterceptorManager()
  private controllers = new Map<string, AbortController>()

  async send(id: string, req: HTTPRequest): Promise<HTTPResponse> {
    this.controllers.get(id)?.abort()

    const controller = new AbortController()
    this.controllers.set(id, controller)

    const timeoutMs =
      typeof req.timeout === 'number' && req.timeout > 0 ? req.timeout : DEFAULT_TIMEOUT_MS

    const timeout = setTimeout(() => {
      controller.abort()
    }, timeoutMs)

    try {
      const finalReq = await this.interceptors.runRequest(req)
      const res = await sendHttpRequest(finalReq, controller.signal)
      return await this.interceptors.runResponse(res)
    } finally {
      clearTimeout(timeout)
      this.controllers.delete(id)
    }
  }

  abort(id: string): void {
    this.controllers.get(id)?.abort()
    this.controllers.delete(id)
  }
}
