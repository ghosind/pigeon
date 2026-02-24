import { IpcMain } from 'electron'
import { initDatabase } from '../../db/sqlite'
import { saveSettings, loadAllSettings, ensureSettings } from '../../db/settings'
import { IPC_SETTINGS_SAVE, IPC_SETTINGS_LOAD } from '../../../shared/constants/channels'

export function registerDbHandlers(ipc: IpcMain): void {
  initDatabase()
  // ensure settings table exists
  try {
    ensureSettings()
  } catch (err) {
    // don't block IPC registration on errors here
    console.error('Failed to ensure settings table:', err)
  }

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
}
