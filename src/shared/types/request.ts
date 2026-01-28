import { HTTPRequest, HTTPResponse } from './http'

export enum RequestType {
  HTTP = 'http'
}

export interface Request {
  id: string
  title?: string
  isTitled?: boolean
  isInCollection?: boolean
  type: RequestType
  request: HTTPRequest
  response?: HTTPResponse
}
