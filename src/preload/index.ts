import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { IPC_REQUEST_ABORT, IPC_REQUEST_SEND } from '@shared/constants/channels'
import { HTTPRequest } from '@shared/types'

const api = {
  sendRequest: (id: string, req: HTTPRequest) => ipcRenderer.invoke(IPC_REQUEST_SEND, id, req),
  abortRequest: (id: string) => ipcRenderer.invoke(IPC_REQUEST_ABORT, id)
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
