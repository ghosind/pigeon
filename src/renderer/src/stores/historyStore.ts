/**
 * historyStore — manages request history records.
 */

import { create } from 'zustand'
import type { RequestHistoryRecord } from '@shared/types'

export interface HistoryGroup {
  label: string
  records: RequestHistoryRecord[]
}

export interface HistoryState {
  records: RequestHistoryRecord[]
  loading: boolean
  hydrate: (workspaceId?: string) => Promise<void>
  addRecord: (record: RequestHistoryRecord) => void
  removeRecord: (id: string) => Promise<void>
  clearAll: () => Promise<void>
  getGroupedHistory: () => HistoryGroup[]
}

function groupByDate(records: RequestHistoryRecord[]): HistoryGroup[] {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)

  const groups: Record<string, RequestHistoryRecord[]> = {
    today: [],
    yesterday: [],
    older: []
  }

  for (const r of records) {
    const d = new Date(r.createTime)
    if (d >= today) {
      groups.today.push(r)
    } else if (d >= yesterday) {
      groups.yesterday.push(r)
    } else {
      groups.older.push(r)
    }
  }

  const result: HistoryGroup[] = []
  if (groups.today.length) result.push({ label: 'history.group.today', records: groups.today })
  if (groups.yesterday.length)
    result.push({ label: 'history.group.yesterday', records: groups.yesterday })
  if (groups.older.length) result.push({ label: 'history.group.older', records: groups.older })
  return result
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  records: [],
  loading: false,

  hydrate: async (workspaceId?: string) => {
    set({ loading: true })
    try {
      const res = await window.api?.listHistory(undefined, undefined, workspaceId)
      if (res?.ok && res.data) {
        set({ records: res.data, loading: false })
      }
    } catch {
      set({ loading: false })
    }
  },

  addRecord: (record) => set((s) => ({ records: [record, ...s.records] })),

  removeRecord: async (id) => {
    try {
      await window.api?.deleteHistory(id)
      set((s) => ({ records: s.records.filter((r) => r.id !== id) }))
    } catch {
      // silently handled
    }
  },

  clearAll: async () => {
    try {
      await window.api?.clearHistory()
      set({ records: [] })
    } catch {
      // silently handled
    }
  },

  getGroupedHistory: () => groupByDate(get().records)
}))
