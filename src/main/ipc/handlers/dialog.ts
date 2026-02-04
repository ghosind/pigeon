import { IpcMain, dialog } from 'electron'
import { IPC_OPEN_FILE } from '@shared/constants/channels'

export function registerDialogHandlers(ipc: IpcMain): void {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  ipc.handle(IPC_OPEN_FILE, async (_event) => {
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
      console.error('Failed to open file dialog:', e)
      return null
    }
  })
}
