export enum HttpMethod {
  GET = 'GET',
  POST = 'POST',
  PUT = 'PUT',
  DELETE = 'DELETE',
  PATCH = 'PATCH',
  HEAD = 'HEAD',
  OPTIONS = 'OPTIONS'
}

export type KeyValuePair = {
  key: string
  value: string
  enabled?: boolean
}

export type HttpRequest = {
  method?: HttpMethod
  url?: string
  headers?: KeyValuePair[]
  params?: KeyValuePair[]
  body?: string
}
