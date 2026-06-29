import { IpcMain, dialog } from 'electron'
import { IPC_DIALOG_OPEN_FILE } from '@shared/constants/channels'

export function registerDialogHandlers(ipc: IpcMain): void {
  ipc.handle(IPC_DIALOG_OPEN_FILE, async (): Promise<string | null> => {
    try {
      const res = await dialog.showOpenDialog({
        properties: ['openFile'],
        filters: []
      })
      if (res.canceled || !res.filePaths || res.filePaths.length === 0) {
        return null
      }
      return res.filePaths[0]
    } catch (e) {
      console.error('[IPC] dialog:open-file — failed:', e)
      return null
    }
  })
}
