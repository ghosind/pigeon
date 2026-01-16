import { request, Dispatcher, FormData, Headers } from 'undici'
import { STATUS_CODES } from 'http'
import { HTTPContentType, HTTPMethod, HTTPRequest, HTTPResponse, KeyValuePair } from '@shared/types'
import { createAgent } from './agent'
import { normalizeError } from './error'

const keyValuePairsToFormData = (pairs: KeyValuePair[]): FormData => {
  const formData = new FormData()
  for (const pair of pairs) {
    if (pair.enabled !== false && pair.key) {
      formData.append(pair.key, pair.value || '')
    }
  }
  return formData
}

function buildHeaders(pairs?: KeyValuePair[]): Headers {
  const headers = new Headers()

  if (!pairs || pairs.length === 0) {
    return headers
  }

  for (const { key, value, enabled } of pairs) {
    if (enabled === false || !key || value == null) {
      continue
    }

    headers.append(key, value)
  }

  return headers
}

const setContentType = (headers: Headers, contentType?: HTTPContentType): void => {
  if (headers.has('content-type')) {
    return
  }

  switch (contentType) {
    case 'xml':
      headers.set('content-type', 'application/xml')
      break
    case 'form':
      headers.set('content-type', 'multipart/form-data')
      break
    case 'urlencoded':
      headers.set('content-type', 'application/x-www-form-urlencoded')
      break
    case 'text':
      headers.set('content-type', 'text/plain')
      break
    default:
      headers.set('content-type', 'application/json')
      break
  }
}

const buildRequestOptions = (
  req: HTTPRequest
): Omit<Dispatcher.RequestOptions<null>, 'origin' | 'path' | 'method'> &
  Dispatcher.DispatchOptions => {
  let body: string | FormData | undefined = undefined
  const headers = buildHeaders(req.headers)

  if (req.method !== HTTPMethod.GET) {
    switch (req.body?.mode) {
      case 'raw':
        body = req.body.data || ''
        setContentType(headers, req.body.contentType)
        break
      case 'urlencoded': {
        const urlSearchParams = new URLSearchParams()
        for (const pair of req.body.urlencoded || []) {
          if (pair.enabled !== false && pair.key) {
            urlSearchParams.append(pair.key, pair.value || '')
          }
        }
        body = urlSearchParams.toString()
        setContentType(headers, 'urlencoded')
        break
      }
      case 'form':
        body = keyValuePairsToFormData(req.body.form || [])
        setContentType(headers, 'form')
        break
    }
  }

  const opts: Dispatcher.DispatchOptions = {
    path: '',
    method: req.method as string,
    headers,
    body
  }

  return opts
}

export async function sendHttpRequest(
  req: HTTPRequest,
  signal?: AbortSignal
): Promise<HTTPResponse> {
  const start = Date.now()
  const dispatcher = createAgent(req.proxy, req.tls)
  const options = buildRequestOptions(req)
  let { url } = req
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`
  }

  try {
    const res = await request(url, {
      ...{
        ...options,
        path: undefined // remove path to let undici use full URL
      },
      dispatcher,
      signal
    })

    return {
      status: res.statusCode,
      statusText: STATUS_CODES[res.statusCode] || '',
      headers: res.headers as Record<string, string>,
      body: await res.body.text(),
      duration: Date.now() - start
    }
  } catch (err) {
    console.log('Request error:', err)
    return {
      status: 0,
      headers: {},
      body: '',
      duration: Date.now() - start,
      error: normalizeError(err)
    }
  }
}
