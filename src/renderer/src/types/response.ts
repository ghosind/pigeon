export type HTTPResponse = {
  status?: number
  statusText?: string
  headers?: Record<string, string>
  body?: string
  duration?: number
}
