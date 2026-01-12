import { ElectronAPI } from '@electron-toolkit/preload'

interface RequestAPI {
  sendRequest: (req: unknown) => Promise<unknown>
  abortRequest: (id: unknown) => Promise<unknown>
}

declare global {
  interface Window {
    electron: ElectronAPI
    api: RequestAPI
  }
}
