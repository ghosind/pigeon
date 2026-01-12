export interface Request {
  id: string
  method: string
  url: string
  headers: Record<string, string>
  body?: string
  timeout?: number
  proxy?: ProxyConfig
  tls?: TLSConfig
}

export interface ProxyConfig {
  host: string
  port: number
  protocol?: 'http' | 'https'
}

export interface TLSConfig {
  rejectUnauthorized?: boolean
  ca?: string
  cert?: string
  key?: string
}
