import { z } from 'zod';
import { IPC } from '@shared/ipc';
import type { AppContext } from '../context';
import { AppError } from '../utils/errors';
import { readTextSchema, saveResponseSchema, sendRequestSchema } from '../utils/validation';
import type { IpcRegistrar } from './registrar';

export function registerRequestIpc(ipc: IpcRegistrar, ctx: AppContext): void {
  ipc.handle(IPC.requestSend, sendRequestSchema, async (input) => {
    const result = await ctx.engine.execute(input as Parameters<typeof ctx.engine.execute>[0]);
    if (!result.ok) {
      throw new AppError(result.error.code, result.error.message, result.error.details);
    }
    return result.data;
  });

  ipc.handle(IPC.requestCancel, z.string().min(1).max(120), (requestId) => {
    ctx.engine.cancel(requestId);
    return null;
  });

  ipc.handle(IPC.responseReadText, readTextSchema, (input) =>
    ctx.bodyStore.readText(input.bodyId, input.offset, input.length)
  );

  ipc.handle(IPC.responseSaveAs, saveResponseSchema, async (input, event) => {
    const { dialog, BrowserWindow } = await import('electron');
    const { copyFile } = await import('node:fs/promises');
    const window = BrowserWindow.fromWebContents(event.sender);
    const safeName = input.suggestedName.replace(/[\\/:*?"<>|]/g, '_') || 'response.bin';
    const result = window
      ? await dialog.showSaveDialog(window, { defaultPath: safeName, title: 'Save response body' })
      : await dialog.showSaveDialog({ defaultPath: safeName, title: 'Save response body' });
    if (result.canceled || !result.filePath) return null;
    await copyFile(ctx.bodyStore.pathFor(input.bodyId), result.filePath);
    return result.filePath;
  });
}
