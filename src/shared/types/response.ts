export interface Response {
  status: number
  headers: Record<string, string>
  body: string
  duration: number
  error?: RequestError
}

export interface RequestError {
  code: string
  message: string
  detail?: unknown
}
