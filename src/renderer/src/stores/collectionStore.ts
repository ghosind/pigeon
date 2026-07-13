/**
 * collectionStore — manages collections, folders, and request tree.
 */

import { create } from 'zustand'
import type { Collection, CollectionFolder, RequestModel } from '@shared/types'

export interface CollectionState {
  collections: Collection[]
  loading: boolean
  hydrate: (workspaceId: string) => Promise<void>
  setCollections: (collections: Collection[]) => void
  addCollection: (collection: Collection) => void
  updateCollection: (id: string, data: Partial<Collection>) => void
  removeCollection: (id: string) => void
  createCollection: (name: string, description?: string) => Promise<Collection | null>
  deleteCollection: (id: string) => Promise<boolean>

  addFolder: (folder: CollectionFolder) => void
  removeFolder: (id: string) => void
  createFolder: (
    collectionId: string,
    name: string,
    parentId?: string | null
  ) => Promise<CollectionFolder | null>

  saveRequestToCollection: (request: RequestModel) => Promise<boolean>
  exportCollection: (id: string) => Promise<unknown>
}

export const useCollectionStore = create<CollectionState>((set, get) => ({
  collections: [],
  loading: false,

  hydrate: async (workspaceId) => {
    set({ loading: true })
    try {
      const res = await window.api?.listCollections(workspaceId)
      if (res?.ok && res.data) {
        set({ collections: res.data, loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  setCollections: (collections) => set({ collections }),

  addCollection: (collection) => set((s) => ({ collections: [...s.collections, collection] })),

  updateCollection: (id, data) =>
    set((s) => ({
      collections: s.collections.map((c) => (c.id === id ? { ...c, ...data } : c))
    })),

  removeCollection: (id) => set((s) => ({ collections: s.collections.filter((c) => c.id !== id) })),

  createCollection: async (name, description) => {
    try {
      const res = await window.api?.createCollection(name, description)
      if (res?.ok && res.data) {
        get().addCollection(res.data)
        return res.data
      }
    } catch {
      // handled silently
    }
    return null
  },

  deleteCollection: async (id) => {
    try {
      const res = await window.api?.deleteCollection(id)
      if (res?.ok) {
        get().removeCollection(id)
        return true
      }
    } catch {
      // handled silently
    }
    return false
  },

  addFolder: (folder) =>
    set((s) => {
      const collection = s.collections.find((c) => c.id === folder.collectionId)
      if (!collection) return s
      return {
        collections: s.collections.map((c) =>
          c.id === folder.collectionId ? { ...c, folders: [...(c.folders || []), folder] } : c
        )
      }
    }),

  removeFolder: (id) =>
    set((s) => ({
      collections: s.collections.map((c) => ({
        ...c,
        folders: (c.folders || []).filter((f) => f.id !== id)
      }))
    })),

  createFolder: async (collectionId, name, parentId) => {
    try {
      const res = await window.api?.createFolder(collectionId, name, parentId)
      if (res?.ok && res.data) {
        get().addFolder(res.data)
        return res.data
      }
    } catch {
      // handled silently
    }
    return null
  },

  saveRequestToCollection: async (request) => {
    try {
      if (request.collectionId) {
        const res = await window.api?.updateRequest(request.id, request)
        return res?.ok ?? false
      } else {
        const res = await window.api?.createRequest(request)
        return res?.ok ?? false
      }
    } catch {
      return false
    }
  },

  exportCollection: async (id) => {
    try {
      const res = await window.api?.exportCollection(id)
      return res?.ok ? res.data : null
    } catch {
      return null
    }
  }
}))
