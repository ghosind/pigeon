import { Request, Response } from '@shared/types'

export type RequestInterceptor = (req: Request) => Promise<Request> | Request

export type ResponseInterceptor = (res: Response) => Promise<Response> | Response

export class InterceptorManager {
  private reqs: RequestInterceptor[] = []
  private ress: ResponseInterceptor[] = []

  useRequest(fn: RequestInterceptor): void {
    this.reqs.push(fn)
  }

  useResponse(fn: ResponseInterceptor): void {
    this.ress.push(fn)
  }

  async runRequest(req: Request): Promise<Request> {
    let r = req
    for (const fn of this.reqs) r = await fn(r)
    return r
  }

  async runResponse(res: Response): Promise<Response> {
    let r = res
    for (const fn of this.ress) r = await fn(r)
    return r
  }
}
