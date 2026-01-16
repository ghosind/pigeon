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
