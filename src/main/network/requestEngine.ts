import { Request, Response } from '@shared/types'
import { InterceptorManager } from './interceptor'
import { sendHttpRequest } from './httpClient'

export class RequestEngine {
  private interceptors = new InterceptorManager()
  private controllers = new Map<string, AbortController>()

  constructor() {
    this.interceptors.useRequest((req) => ({
      ...req,
      headers: {
        'user-agent': 'MyElectronClient/1.0',
        ...req.headers
      }
    }))
  }

  async send(req: Request): Promise<Response> {
    const controller = new AbortController()
    this.controllers.set(req.id, controller)

    const timeout = setTimeout(() => {
      controller.abort()
    }, req.timeout ?? 15000)

    try {
      const finalReq = await this.interceptors.runRequest(req)
      const res = await sendHttpRequest(finalReq, controller.signal)
      return await this.interceptors.runResponse(res)
    } finally {
      clearTimeout(timeout)
      this.controllers.delete(req.id)
    }
  }

  abort(id: string): void {
    this.controllers.get(id)?.abort()
    this.controllers.delete(id)
  }
}
