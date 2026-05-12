import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import {
  IPC_REQUEST_ABORT,
  IPC_REQUEST_SEND,
  IPC_OPEN_FILE,
  IPC_SETTINGS_SAVE,
  IPC_SETTINGS_LOAD,
  IPC_COLLECTIONS_SAVE,
  IPC_COLLECTIONS_LOAD,
  IPC_COLLECTIONS_SEARCH,
  IPC_HISTORY_SAVE,
  IPC_HISTORY_LOAD,
  IPC_HISTORY_SEARCH
} from '@shared/constants/channels'
import { CollectionNode, HTTPRequest, RequestHistory } from '@shared/types'

const api = {
  sendRequest: (id: string, req: HTTPRequest) => ipcRenderer.invoke(IPC_REQUEST_SEND, id, req),
  abortRequest: (id: string) => ipcRenderer.invoke(IPC_REQUEST_ABORT, id),
  openFileDialog: () => ipcRenderer.invoke(IPC_OPEN_FILE),
  saveSettings: (settings: Record<string, string>) =>
    ipcRenderer.invoke(IPC_SETTINGS_SAVE, settings),
  loadSettings: () => ipcRenderer.invoke(IPC_SETTINGS_LOAD),
  saveCollections: (collections: CollectionNode[]) =>
    ipcRenderer.invoke(IPC_COLLECTIONS_SAVE, collections),
  loadCollections: () => ipcRenderer.invoke(IPC_COLLECTIONS_LOAD),
  searchCollections: (keyword: string, limit?: number) =>
    ipcRenderer.invoke(IPC_COLLECTIONS_SEARCH, keyword, limit),
  saveHistory: (history: RequestHistory[]) => ipcRenderer.invoke(IPC_HISTORY_SAVE, history),
  loadHistory: () => ipcRenderer.invoke(IPC_HISTORY_LOAD),
  searchHistory: (keyword: string, limit?: number) =>
    ipcRenderer.invoke(IPC_HISTORY_SEARCH, keyword, limit)
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
