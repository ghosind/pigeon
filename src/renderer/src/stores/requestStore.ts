/**
 * requestStore — manages the currently-edited request configuration.
 */

import { create } from 'zustand'
import type {
  RequestModel,
  KeyValuePair,
  HTTPAuthorization,
  HTTPBody,
  HTTPMethod
} from '@shared/types'

export interface RequestState {
  currentRequest: RequestModel | null
  isSending: boolean
  abortController: AbortController | null

  initRequest: (request?: Partial<RequestModel>) => void
  updateMethod: (method: HTTPMethod) => void
  updateUrl: (url: string) => void
  updateName: (name: string) => void
  updateParams: (params: KeyValuePair[]) => void
  updateHeaders: (headers: KeyValuePair[]) => void
  updateBody: (body: HTTPBody) => void
  updateAuth: (auth: HTTPAuthorization) => void
  setSending: (sending: boolean) => void
  setAbortController: (ctrl: AbortController | null) => void
  abortRequest: () => void
}

export const useRequestStore = create<RequestState>((set, get) => ({
  currentRequest: null,
  isSending: false,
  abortController: null,

  initRequest: (request) =>
    set({
      currentRequest: request
        ? {
            id: '',
            name: '',
            method: 'GET' as HTTPMethod,
            url: '',
            starred: false,
            sort: 0,
            deleted: false,
            createTime: new Date().toISOString(),
            updateTime: new Date().toISOString(),
            ...request
          }
        : null
    }),

  updateMethod: (method) =>
    set((s) => ({
      currentRequest: s.currentRequest ? { ...s.currentRequest, method } : null
    })),

  updateUrl: (url) =>
    set((s) => ({
      currentRequest: s.currentRequest ? { ...s.currentRequest, url } : null
    })),

  updateName: (name) =>
    set((s) => ({
      currentRequest: s.currentRequest ? { ...s.currentRequest, name } : null
    })),

  updateParams: (params) =>
    set((s) => ({
      currentRequest: s.currentRequest ? { ...s.currentRequest, params } : null
    })),

  updateHeaders: (headers) =>
    set((s) => ({
      currentRequest: s.currentRequest ? { ...s.currentRequest, headers } : null
    })),

  updateBody: (body) =>
    set((s) => ({
      currentRequest: s.currentRequest ? { ...s.currentRequest, body } : null
    })),

  updateAuth: (auth) =>
    set((s) => ({
      currentRequest: s.currentRequest ? { ...s.currentRequest, auth } : null
    })),

  setSending: (isSending) => set({ isSending }),

  setAbortController: (ctrl) => set({ abortController: ctrl }),

  abortRequest: () => {
    const ctrl = get().abortController
    if (ctrl) {
      ctrl.abort()
      set({ abortController: null, isSending: false })
    }
  }
}))
