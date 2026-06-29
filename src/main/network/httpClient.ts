import { request, Dispatcher, FormData, Headers } from 'undici'
import { STATUS_CODES } from 'http'
import { HTTPRequestConfig, HTTPResponse, KeyValuePair, BodyMode, AuthType } from '@shared/types'
import { createAgent } from './agent'
import { normalizeError } from './error'
import { promises as fs } from 'fs'
import path from 'path'
import os from 'os'

const DefaultUserAgent = `Pigeon/${process.env.npm_package_version || '0.1.0'}`

/** Validate that a file path is safe to read (no traversal outside home dir). */
function isSafePath(filePath: string): boolean {
  if (!filePath || filePath.includes('..')) {
    return false
  }
  const resolved = path.resolve(filePath)
  const homeDir = os.homedir()
  // Allow paths under home directory and common temp directories
  return (
    resolved.startsWith(homeDir) || resolved.startsWith('/tmp') || resolved.startsWith(os.tmpdir())
  )
}

const normalizeResponseHeaders = (
  headers: Record<string, string | string[] | undefined>
): Record<string, string> => {
  const result: Record<string, string> = {}
  for (const [key, value] of Object.entries(headers)) {
    if (value == null) {
      continue
    }
    result[key] = Array.isArray(value) ? value.join(', ') : value
  }
  return result
}

const getResponseSize = (headers: Record<string, string>, body: string): number => {
  const contentLength = headers['content-length']
  if (typeof contentLength === 'string') {
    const parsed = Number.parseInt(contentLength, 10)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }
  return Buffer.byteLength(body, 'utf8')
}

const keyValuePairsToFormData = async (pairs: KeyValuePair[]): Promise<FormData> => {
  const formData = new FormData()
  for (const pair of pairs) {
    if (pair.enabled === false || !pair.key) continue

    if (pair.type === 'file') {
      const content = await fs.readFile(pair.value)
      const fileName = pair.value.split('/').pop() || ''
      const file = new File([content], fileName)
      formData.append(pair.key, file, fileName)
    } else {
      formData.append(pair.key, pair.value || '')
    }
  }
  return formData
}

function buildHeaders(pairs?: KeyValuePair[]): Headers {
  const headers = new Headers()

  for (const { key, value, enabled } of pairs || []) {
    if (enabled === false || !key || value == null) continue
    headers.append(key, value)
  }

  if (!headers.has('user-agent')) {
    headers.set('user-agent', DefaultUserAgent)
  }

  return headers
}

/** Inject auth headers based on auth config. */
function injectAuthHeaders(headers: Headers, auth: HTTPRequestConfig['auth']): void {
  if (!auth || auth.type === AuthType.None) return

  switch (auth.type) {
    case AuthType.Bearer:
      if (auth.token && !headers.has('authorization')) {
        headers.set('authorization', `Bearer ${auth.token}`)
      }
      break
    case AuthType.Basic: {
      if (!headers.has('authorization')) {
        const cred = `${auth.username || ''}:${auth.password || ''}`
        const encoded = Buffer.from(cred).toString('base64')
        headers.set('authorization', `Basic ${encoded}`)
      }
      break
    }
  }
}

const buildRequestOptions = async (
  req: HTTPRequestConfig
): Promise<
  Omit<Dispatcher.RequestOptions<null>, 'origin' | 'path' | 'method'> & Dispatcher.DispatchOptions
> => {
  let body: string | FormData | Buffer | Uint8Array<ArrayBuffer> | undefined = undefined
  const headers = buildHeaders(req.headers)

  // Inject auth
  injectAuthHeaders(headers, req.auth)

  // Build body
  switch (req.body?.mode) {
    case BodyMode.Raw: {
      body = req.body.rawContent || ''
      const rawType = req.body.rawType
      if (!headers.has('content-type')) {
        if (rawType === 'xml') headers.set('content-type', 'application/xml')
        else if (rawType === 'text') headers.set('content-type', 'text/plain')
        else if (rawType === 'html') headers.set('content-type', 'text/html')
        else headers.set('content-type', 'application/json')
      }
      break
    }
    case BodyMode.UrlEncoded: {
      const urlSearchParams = new URLSearchParams()
      for (const pair of req.body.urlEncodedItems || []) {
        if (pair.enabled !== false && pair.key) {
          urlSearchParams.append(pair.key, pair.value || '')
        }
      }
      body = urlSearchParams.toString()
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/x-www-form-urlencoded')
      }
      break
    }
    case BodyMode.FormData:
      body = await keyValuePairsToFormData(req.body.formItems || [])
      break
    case BodyMode.Binary: {
      const filePath = req.body.binaryPath
      if (filePath) {
        if (!isSafePath(filePath)) {
          console.error('[HTTP] Unsafe binary file path rejected:', filePath)
          body = ''
          break
        }
        try {
          const buf = await fs.readFile(filePath)
          body = buf
          if (!headers.has('content-type')) {
            headers.set('content-type', 'application/octet-stream')
          }
        } catch (e) {
          console.error('[HTTP] Failed to read binary file:', e)
          body = ''
        }
      }
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

/**
 * Send an HTTP request using undici.
 *
 * @param req - The request configuration
 * @param signal - Optional AbortSignal for cancellation
 * @returns HTTPResponse with status, headers, body, timing, and size
 */
export async function sendHttpRequest(
  req: HTTPRequestConfig,
  signal?: AbortSignal
): Promise<HTTPResponse> {
  const start = Date.now()

  // Build TLS config from request settings
  const tlsConfig = req.settings?.ignoreSSL ? { rejectUnauthorized: false } : undefined

  const dispatcher = createAgent(req.proxy, tlsConfig)
  const options = await buildRequestOptions(req)

  let { url } = req
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`
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

    const body = await res.body.text()
    const responseHeaders = normalizeResponseHeaders(res.headers)
    const size = getResponseSize(responseHeaders, body)

    // Extract cookies from set-cookie headers
    const cookies: HTTPResponse['cookies'] = []
    const setCookieHeaders = res.headers['set-cookie']
    if (setCookieHeaders) {
      const cookieStrs = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders]
      for (const cookieStr of cookieStrs) {
        const parts = cookieStr.split(';').map((s) => s.trim())
        const [nameValue] = parts[0]?.split('=') || []
        if (nameValue) {
          cookies.push({
            domain: new URL(url).hostname,
            name: parts[0].split('=')[0],
            value: parts[0].split('=').slice(1).join('=') || '',
            path: '/'
          })
        }
      }
    }

    return {
      status: res.statusCode,
      statusText: STATUS_CODES[res.statusCode] || '',
      headers: responseHeaders,
      body,
      size,
      duration: Date.now() - start,
      cookies
    }
  } catch (err) {
    console.error('[HTTP] Request failed:', (err as Error).message)
    const reqErr = normalizeError(err)
    return {
      statusText: reqErr.message,
      headers: {},
      body: '',
      duration: Date.now() - start,
      error: reqErr
    }
  }
}
