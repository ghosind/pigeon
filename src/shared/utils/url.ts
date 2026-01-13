const ProtocolPattern = /^[a-zA-Z][a-zA-Z\d+\-.]*:\/\//

export class Url {
  readonly raw: string

  protocol = ''
  username = ''
  password = ''
  host = ''
  hostname = ''
  port = ''
  pathname = '/'
  search = ''
  hash = ''

  constructor(input?: string | null) {
    this.raw = String(input ?? '').trim()
    this.parse()
  }

  private parse(): void {
    if (!this.raw) return

    let rest = this.raw

    const hashIndex = rest.indexOf('#')
    if (hashIndex >= 0) {
      this.hash = rest.slice(hashIndex)
      rest = rest.slice(0, hashIndex)
    }

    const searchIndex = rest.indexOf('?')
    if (searchIndex >= 0) {
      this.search = rest.slice(searchIndex)
      rest = rest.slice(0, searchIndex)
    }

    const protoMatch = rest.match(ProtocolPattern)
    if (protoMatch) {
      this.protocol = `${protoMatch[1]}:`
      rest = rest.slice(protoMatch[0].length)
    }

    if (!rest.startsWith('/')) {
      const slashIndex = rest.indexOf('/')
      const authority = slashIndex >= 0 ? rest.slice(0, slashIndex) : rest
      rest = slashIndex >= 0 ? rest.slice(slashIndex) : ''

      const atIndex = authority.lastIndexOf('@')
      const hostPart = atIndex >= 0 ? authority.slice(atIndex + 1) : authority

      if (atIndex >= 0) {
        const auth = authority.slice(0, atIndex)
        const [user, pass = ''] = auth.split(':')
        this.username = user
        this.password = pass
      }

      const portIndex = hostPart.lastIndexOf(':')
      if (portIndex > 0) {
        this.hostname = hostPart.slice(0, portIndex)
        this.port = hostPart.slice(portIndex + 1)
        this.host = hostPart
      } else {
        this.hostname = hostPart
        this.host = hostPart
      }
    }

    if (rest) {
      this.pathname = rest.startsWith('/') ? rest : '/' + rest
    }
  }

  get isAbsolute(): boolean {
    return Boolean(this.protocol)
  }

  get origin(): string {
    if (!this.protocol || !this.host) return ''
    return `${this.protocol}//${this.host}`
  }

  get href(): string {
    let out = ''

    if (this.protocol) {
      out += `${this.protocol}//`
    }

    if (this.username) {
      out += this.username
      if (this.password) out += `:${this.password}`
      out += '@'
    }

    if (this.host) {
      out += this.host
    }

    out += this.pathname || '/'

    if (this.search) {
      if (!this.search.startsWith('?')) out += '?'
      out += this.search
    }
    if (this.hash) out += this.hash

    return out
  }

  get searchParams(): URLSearchParams {
    return new URLSearchParams(this.search.startsWith('?') ? this.search.slice(1) : '')
  }

  toString(): string {
    return this.href
  }

  toJSON(): string {
    return this.href
  }
}
