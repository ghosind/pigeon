import { Agent, ProxyAgent } from 'undici'
import type { HTTPProxyConfig } from '@shared/types'

interface TLSConfig {
  rejectUnauthorized?: boolean
}

export function createAgent(proxy?: HTTPProxyConfig, tls?: TLSConfig): ProxyAgent | Agent {
  if (proxy && proxy.host && proxy.port) {
    return new ProxyAgent({
      uri: `${proxy.protocol ?? 'http'}://${proxy.host}:${proxy.port}`,
      connect: {
        rejectUnauthorized: tls?.rejectUnauthorized ?? true
      }
    })
  }

  return new Agent({
    connect: {
      rejectUnauthorized: tls?.rejectUnauthorized ?? true
    }
  })
}
