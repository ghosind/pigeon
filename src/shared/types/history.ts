import { HTTPRequest, HTTPResponse } from './http'
import { RequestType } from './request'

export type RequestHistory = {
  id: string
  requestId: string
  timestamp: number
  type: RequestType
  request: HTTPRequest
  response?: HTTPResponse
}
