import { ElectronAPI } from '@electron-toolkit/preload'
import { CollectionNode, HTTPRequest, HTTPResponse, RequestHistory } from '@shared/types'

interface RequestAPI {
  sendRequest: (id: string, req: HTTPRequest) => Promise<HTTPResponse>
  abortRequest: (id: string) => Promise<unknown>
  openFileDialog: () => Promise<string | null>
  saveSettings: (settings: Record<string, string>) => Promise<{ ok: boolean; error?: string }>
  loadSettings: () => Promise<{ ok: boolean; result?: Record<string, string>; error?: string }>
  saveCollections: (collections: CollectionNode[]) => Promise<{ ok: boolean; error?: string }>
  loadCollections: () => Promise<{ ok: boolean; result?: CollectionNode[]; error?: string }>
  saveHistory: (history: RequestHistory[]) => Promise<{ ok: boolean; error?: string }>
  loadHistory: () => Promise<{ ok: boolean; result?: RequestHistory[]; error?: string }>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: RequestAPI
  }
}
