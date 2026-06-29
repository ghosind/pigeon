// =========================================================================
// HTTP domain types — request/response config, body, auth, headers, params
// =========================================================================

import type { BodyMode, RawType, AuthType, ItemType, HTTPMethod } from './enums'

export interface KeyValuePair {
  id?: string
  key: string
  type?: ItemType
  value: string
  description?: string
  enabled: boolean
  sort?: number
}

export interface HTTPAuthorization {
  type: AuthType
  token?: string
  username?: string
  password?: string
}

export interface HTTPBody {
  mode: BodyMode
  rawType?: RawType
  rawContent?: string
  binaryPath?: string
  formItems?: KeyValuePair[]
  urlEncodedItems?: KeyValuePair[]
}

export interface HTTPSettings {
  timeout: number
  followRedirect: boolean
  ignoreSSL: boolean
  useProxy: boolean
  proxyUrl?: string
}

export interface HTTPProxyConfig {
  host: string
  port: number
  protocol?: 'http' | 'https'
  auth?: { username: string; password: string }
}

export interface HTTPRequestConfig {
  method: HTTPMethod
  url: string
  auth?: HTTPAuthorization
  headers?: KeyValuePair[]
  params?: KeyValuePair[]
  body?: HTTPBody
  settings?: HTTPSettings
  proxy?: HTTPProxyConfig
}

export interface HTTPRequestError {
  code: string
  message: string
  detail?: unknown
}

export interface CookieInfo {
  domain: string
  name: string
  value: string
  path: string
  expires?: string
  httpOnly?: boolean
  secure?: boolean
}

export interface HTTPResponse {
  status?: number
  statusText?: string
  headers?: Record<string, string>
  body?: string
  duration?: number
  size?: number
  cookies?: CookieInfo[]
  error?: HTTPRequestError
}
