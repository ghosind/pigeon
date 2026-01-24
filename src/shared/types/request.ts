import { HTTPRequest, HTTPResponse } from './http'

export enum RequestType {
  HTTP = 'http'
}

export interface Request {
  id: string
  title: string
  type: RequestType
  request: HTTPRequest
  response?: HTTPResponse
}
