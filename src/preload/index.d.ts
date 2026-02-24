import { ElectronAPI } from '@electron-toolkit/preload'
import { HTTPRequest, HTTPResponse } from '@shared/types'

interface RequestAPI {
  sendRequest: (id: string, req: HTTPRequest) => Promise<HTTPResponse>
  abortRequest: (id: string) => Promise<unknown>
  openFileDialog: () => Promise<string | null>
  saveSettings: (settings: Record<string, string>) => Promise<{ ok: boolean; error?: string }>
  loadSettings: () => Promise<{ ok: boolean; result?: Record<string, string>; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: RequestAPI
  }
}
