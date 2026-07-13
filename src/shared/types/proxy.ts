// =========================================================================
// Proxy configuration
// =========================================================================

export type ProxyType = 'http' | 'https' | 'socks5'

export interface ProxyConfig {
  id: string
  name: string
  type: ProxyType
  host: string
  port: number
  username?: string
  password?: string
  isActive: boolean
  createTime: string
  updateTime: string
}
