import { Agent, ProxyAgent } from 'undici'
import { HTTPProxyConfig, HTTPTLSConfig } from '@shared/types'

export function createAgent(proxy?: HTTPProxyConfig, tls?: HTTPTLSConfig): ProxyAgent | Agent {
  if (proxy) {
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
