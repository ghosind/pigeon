import { HTTPRequest, HTTPResponse } from '@shared/types'

export type RequestInterceptor = (req: HTTPRequest) => Promise<HTTPRequest> | HTTPRequest

export type ResponseInterceptor = (res: HTTPResponse) => Promise<HTTPResponse> | HTTPResponse
export class InterceptorManager {
  private reqs: RequestInterceptor[] = []
  private ress: ResponseInterceptor[] = []

  useRequest(fn: RequestInterceptor): void {
    this.reqs.push(fn)
  }

  useResponse(fn: ResponseInterceptor): void {
    this.ress.push(fn)
  }

  async runRequest(req: HTTPRequest): Promise<HTTPRequest> {
    let r = req
    for (const fn of this.reqs) {
      r = await fn(r)
    }
    return r
  }

  async runResponse(res: HTTPResponse): Promise<HTTPResponse> {
    let r = res
    for (const fn of this.ress) {
      r = await fn(r)
    }
    return r
  }
}
