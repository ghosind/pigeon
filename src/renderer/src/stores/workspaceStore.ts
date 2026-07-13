/**
 * workspaceStore — manages workspace CRUD and active workspace selection.
 */

import { create } from 'zustand'
import type { Workspace } from '@shared/types'

export interface WorkspaceState {
  workspaces: Workspace[]
  activeWorkspaceId: string | null
  loading: boolean
  hydrate: () => Promise<void>
  setActiveWorkspace: (id: string) => void
  addWorkspace: (workspace: Workspace) => void
  updateWorkspace: (id: string, data: Partial<Workspace>) => void
  removeWorkspace: (id: string) => void
  createWorkspace: (name: string, description?: string) => Promise<Workspace | null>
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  workspaces: [],
  activeWorkspaceId: null,
  loading: false,

  hydrate: async () => {
    set({ loading: true })
    try {
      const res = await window.api?.listWorkspaces()
      if (res?.ok && res.data) {
        set({ workspaces: res.data, loading: false })
        const active = get().activeWorkspaceId
        if (!active && res.data.length > 0) {
          set({ activeWorkspaceId: res.data[0].id })
        }
      }
    } catch {
      set({ loading: false })
    }
  },

  setActiveWorkspace: (id) => set({ activeWorkspaceId: id }),

  addWorkspace: (workspace) => set((s) => ({ workspaces: [...s.workspaces, workspace] })),

  updateWorkspace: (id, data) =>
    set((s) => ({
      workspaces: s.workspaces.map((w) => (w.id === id ? { ...w, ...data } : w))
    })),

  removeWorkspace: (id) =>
    set((s) => ({
      workspaces: s.workspaces.filter((w) => w.id !== id),
      activeWorkspaceId: s.activeWorkspaceId === id ? null : s.activeWorkspaceId
    })),

  createWorkspace: async (name, description) => {
    try {
      const res = await window.api?.createWorkspace(name, description)
      if (res?.ok && res.data) {
        get().addWorkspace(res.data)
        return res.data
      }
    } catch {
      // handled silently
    }
    return null
  }
}))
