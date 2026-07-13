/**
 * envStore — manages environments and environment variables.
 */

import { create } from 'zustand'
import type { Environment, EnvironmentVariable } from '@shared/types'

export interface EnvState {
  environments: Environment[]
  activeEnvironmentId: string | null
  variableMap: Record<string, string>
  loading: boolean
  hydrate: () => Promise<void>
  setActiveEnvironment: (id: string) => Promise<void>
  addEnvironment: (env: Environment) => void
  updateEnvironment: (id: string, data: Partial<Environment>) => void
  removeEnvironment: (id: string) => void
  createEnvironment: (
    name: string,
    variables?: EnvironmentVariable[]
  ) => Promise<Environment | null>
  deleteEnvironment: (id: string) => Promise<boolean>
}

export const useEnvStore = create<EnvState>((set, get) => ({
  environments: [],
  activeEnvironmentId: null,
  variableMap: {},
  loading: false,

  hydrate: async () => {
    set({ loading: true })
    try {
      const res = await window.api?.listEnvironments()
      if (res?.ok && res.data) {
        const envs = res.data
        const active = envs.find((e) => e.isActive)
        set({ environments: envs, loading: false })
        if (active) {
          set({ activeEnvironmentId: active.id })
          // Build variable map from active environment
          const vars: Record<string, string> = {}
          for (const v of active.variables || []) {
            if (v.enabled) vars[v.key] = v.value
          }
          set({ variableMap: vars })
        }
      }
    } catch {
      set({ loading: false })
    }
  },

  setActiveEnvironment: async (id) => {
    try {
      await window.api?.activateEnvironment(id)
      set({ activeEnvironmentId: id })
      // Rebuild variable map
      const env = get().environments.find((e) => e.id === id)
      const vars: Record<string, string> = {}
      for (const v of env?.variables || []) {
        if (v.enabled) vars[v.key] = v.value
      }
      set({ variableMap: vars })
    } catch {
      // silently handled
    }
  },

  addEnvironment: (env) => set((s) => ({ environments: [...s.environments, env] })),

  updateEnvironment: (id, data) =>
    set((s) => ({
      environments: s.environments.map((e) => (e.id === id ? { ...e, ...data } : e))
    })),

  removeEnvironment: (id) =>
    set((s) => ({
      environments: s.environments.filter((e) => e.id !== id),
      activeEnvironmentId: s.activeEnvironmentId === id ? null : s.activeEnvironmentId
    })),

  createEnvironment: async (name, variables) => {
    try {
      const res = await window.api?.createEnvironment(name)
      if (res?.ok && res.data) {
        const env = res.data
        if (variables?.length) {
          await window.api?.batchSaveEnvVariables(env.id, variables)
          env.variables = variables
        }
        get().addEnvironment(env)
        return env
      }
    } catch {
      // silently handled
    }
    return null
  },

  deleteEnvironment: async (id) => {
    try {
      const res = await window.api?.deleteEnvironment(id)
      if (res?.ok) {
        get().removeEnvironment(id)
        return true
      }
    } catch {
      // silently handled
    }
    return false
  }
}))
