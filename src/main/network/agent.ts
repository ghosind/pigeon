// agent.ts
import { Agent, ProxyAgent } from 'undici'
import { ProxyConfig, TLSConfig } from '@shared/types'

export function createAgent(proxy?: ProxyConfig, tls?: TLSConfig): ProxyAgent | Agent {
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
