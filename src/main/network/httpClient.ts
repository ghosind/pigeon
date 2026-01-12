import { request } from 'undici'
import { Request, Response } from '@shared/types'
import { createAgent } from './agent'
import { normalizeError } from './error'

export async function sendHttpRequest(req: Request, signal?: AbortSignal): Promise<Response> {
  const start = Date.now()
  const dispatcher = createAgent(req.proxy, req.tls)

  try {
    const res = await request(req.url, {
      method: req.method,
      headers: req.headers,
      body: req.body,
      dispatcher,
      signal
    })

    return {
      status: res.statusCode,
      headers: res.headers as Record<string, string>,
      body: await res.body.text(),
      duration: Date.now() - start
    }
  } catch (err) {
    return {
      status: 0,
      headers: {},
      body: '',
      duration: Date.now() - start,
      error: normalizeError(err)
    }
  }
}
