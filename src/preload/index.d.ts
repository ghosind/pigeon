import { ElectronAPI } from '@electron-toolkit/preload'
import { HTTPRequest, HTTPResponse } from '@shared/types'

interface RequestAPI {
  sendRequest: (id: string, req: HTTPRequest) => Promise<HTTPResponse>
  abortRequest: (id: string) => Promise<unknown>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: RequestAPI
  }
}
