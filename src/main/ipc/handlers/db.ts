import { IpcMain } from 'electron'
import { initDatabase } from '../../db/sqlite'
import { saveSettings, loadAllSettings, ensureSettings } from '../../db/settings'
import {
  IPC_SETTINGS_SAVE,
  IPC_SETTINGS_LOAD,
  IPC_COLLECTIONS_SAVE,
  IPC_COLLECTIONS_LOAD,
  IPC_HISTORY_SAVE,
  IPC_HISTORY_LOAD
} from '@shared/constants/channels'
import { saveCollections, loadCollections, ensureCollectionsStore } from '../../db/collection'
import { saveHistory, loadHistory, ensureHistoryStore } from '../../db/history'
import { CollectionNode, RequestHistory } from '@shared/types'

export function registerDbHandlers(ipc: IpcMain): void {
  initDatabase()
  // ensure settings table exists
  void ensureSettings().catch((err: unknown) => {
    // don't block IPC registration on errors here
    console.error('Failed to ensure settings table:', err)
  })
  void ensureCollectionsStore().catch((err: unknown) => {
    console.error('Failed to ensure collections table:', err)
  })
  void ensureHistoryStore().catch((err: unknown) => {
    console.error('Failed to ensure history table:', err)
  })

  ipc.handle(IPC_SETTINGS_SAVE, async (_ev, settings: Record<string, string>) => {
    try {
      await saveSettings(settings)
      return { ok: true }
    } catch (err: unknown) {
      return { ok: false, error: (err as Error)?.message ?? String(err) }
    }
  })

  ipc.handle(IPC_SETTINGS_LOAD, async () => {
    try {
      const data = await loadAllSettings()
      return { ok: true, result: data }
    } catch (err: unknown) {
      return { ok: false, error: (err as Error)?.message ?? String(err) }
    }
  })

  ipc.handle(IPC_COLLECTIONS_SAVE, async (_ev, collections: CollectionNode[]) => {
    try {
      await saveCollections(collections)
      return { ok: true }
    } catch (err: unknown) {
      return { ok: false, error: (err as Error)?.message ?? String(err) }
    }
  })

  ipc.handle(IPC_COLLECTIONS_LOAD, async () => {
    try {
      const data = await loadCollections()
      return { ok: true, result: data }
    } catch (err: unknown) {
      return { ok: false, error: (err as Error)?.message ?? String(err) }
    }
  })

  ipc.handle(IPC_HISTORY_SAVE, async (_ev, history: RequestHistory[]) => {
    try {
      await saveHistory(history)
      return { ok: true }
    } catch (err: unknown) {
      return { ok: false, error: (err as Error)?.message ?? String(err) }
    }
  })

  ipc.handle(IPC_HISTORY_LOAD, async () => {
    try {
      const data = await loadHistory()
      return { ok: true, result: data }
    } catch (err: unknown) {
      return { ok: false, error: (err as Error)?.message ?? String(err) }
    }
  })
}
