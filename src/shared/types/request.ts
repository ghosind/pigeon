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

export type HTTPBodyMode = 'none' | 'raw' | 'form' | 'urlencoded'
export type HTTPContentType = 'json' | 'xml' | 'form' | 'urlencoded' | 'text'

export type HTTPBody = {
  mode: HTTPBodyMode
  contentType?: HTTPContentType
  data?: string
  form?: KeyValuePair[]
  urlencoded?: KeyValuePair[]
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
  id?: string
  method?: HTTPMethod
  url: string
  headers?: KeyValuePair[]
  params?: KeyValuePair[]
  body?: HTTPBody
  timeout?: number
  proxy?: HTTPProxyConfig
  tls?: HTTPTLSConfig
}
