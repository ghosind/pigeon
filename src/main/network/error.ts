import { RequestError } from '@shared/types'

export type RequestErrorCode =
  | 'ABORTED'
  | 'TIMEOUT'
  | 'DNS'
  | 'CONNECTION'
  | 'TLS'
  | 'HTTP'
  | 'UNKNOWN'

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

export function normalizeError(err: unknown): RequestError {
  if (isObject(err) && err['name'] === 'AbortError') {
    return {
      code: 'ABORTED',
      message: 'Request aborted',
      detail: err
    }
  }

  if (isObject(err) && typeof err['code'] === 'string') {
    const code = err['code']

    if (code === 'ETIMEDOUT') {
      return { code: 'TIMEOUT', message: 'Request timeout', detail: err }
    }

    if (code === 'ENOTFOUND') {
      return { code: 'DNS', message: 'DNS lookup failed', detail: err }
    }

    if (code.startsWith('ECONN')) {
      return { code: 'CONNECTION', message: 'Connection error', detail: err }
    }

    return {
      code: 'UNKNOWN',
      message: typeof err['message'] === 'string' ? err['message'] : 'Network error',
      detail: err
    }
  }

  if (err instanceof globalThis.Error) {
    return {
      code: 'UNKNOWN',
      message: err.message,
      detail: err
    }
  }

  return {
    code: 'UNKNOWN',
    message: 'Unknown error',
    detail: err
  }
}
