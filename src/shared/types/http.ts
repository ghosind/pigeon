import type { KeyValuePair } from './kv'

export enum HTTPMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

export type HTTPBodyMode = 'none' | 'raw' | 'form' | 'urlencoded' | 'binary'
export type HTTPContentType = 'json' | 'xml' | 'form' | 'urlencoded' | 'text' | string

export type HTTPAuthorization = {
  type: 'none' | 'basic' | 'bearer'
  username?: string
  password?: string
  token?: string
}

export type HTTPBody = {
  mode: HTTPBodyMode
  contentType?: HTTPContentType
  data?: string
  form?: KeyValuePair[]
  urlencoded?: KeyValuePair[]
  filePath?: string
}

export interface HTTPProxyConfig {
  host: string
  port: number
  protocol?: 'http' | 'https'
}

export interface HTTPTLSConfig {
  rejectUnauthorized?: boolean
  ca?: string
  cert?: string
  key?: string
}

export interface HTTPRequest {
  method?: HTTPMethod
  url: string
  auth?: HTTPAuthorization
  headers?: KeyValuePair[]
  params?: KeyValuePair[]
  body?: HTTPBody
  timeout?: number
  proxy?: HTTPProxyConfig
  tls?: HTTPTLSConfig
}

export interface HTTPRequestError {
  code: string
  message: string
  detail?: unknown
}

export interface HTTPResponse {
  status?: number
  statusText?: string
  headers?: Record<string, string>
  body?: string
  duration?: number
  size?: number
  error?: HTTPRequestError
}
