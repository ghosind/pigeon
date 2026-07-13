/**
 * responseStore — manages the last response data.
 */

import { create } from 'zustand'
import type { HTTPResponse } from '@shared/types'

export interface ResponseState {
  response: HTTPResponse | null
  setResponse: (response: HTTPResponse | null) => void
  clearResponse: () => void
}

export const useResponseStore = create<ResponseState>((set) => ({
  response: null,

  setResponse: (response) => set({ response }),

  clearResponse: () => set({ response: null })
}))
