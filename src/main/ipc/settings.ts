import { z } from 'zod';
import { app, BrowserWindow, dialog } from 'electron';
import { IPC } from '@shared/ipc';
import type { AppContext } from '../context';
import { AppError } from '../utils/errors';
import { dataDirState, migrateDataDirectory } from '../services/data-dir';
import { preferenceSchema } from '../utils/validation';
import { createLogger } from '../utils/logger';
import type { IpcRegistrar } from './registrar';

const logger = createLogger('settings-ipc');

export function registerSettingsIpc(ipc: IpcRegistrar, ctx: AppContext): void {
  ipc.handle(IPC.settingsGet, null, () => ctx.preferences.get());

  ipc.handle(IPC.settingsSave, preferenceSchema, (input) => {
    if (input.dataDir && input.dataDir !== ctx.dataDir) {
      throw new AppError('VALIDATION_ERROR', 'Use the “Change folder” action to move the data directory');
    }
    return ctx.preferences.save({ ...input, dataDir: ctx.dataDir });
  });

  ipc.handle(
    IPC.settingsPickFile,
    z.object({
      title: z.string().max(200).optional(),
      filters: z.array(z.object({ name: z.string().max(100), extensions: z.array(z.string().max(20)).max(30) })).optional()
    }),
    async (input, event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const options = {
        title: input.title ?? 'Choose a file',
        properties: ['openFile' as const],
        filters: input.filters
      };
      const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
      return result.canceled ? null : result.filePaths[0] ?? null;
    }
  );

  ipc.handle(IPC.settingsPickDirectory, null, async (_input, event) => {
    const window = BrowserWindow.fromWebContents(event.sender);
    const options = { title: 'Choose a data folder', properties: ['openDirectory' as const, 'createDirectory' as const] };
    const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
    return result.canceled ? null : result.filePaths[0] ?? null;
  });

  ipc.handle(IPC.settingsChangeDataDir, z.string().min(1).max(8192), async (target) => {
    const state = dataDirState();
    if (state.portable || state.overridden) {
      throw new AppError('VALIDATION_ERROR', 'The data folder is fixed in portable/override mode');
    }
    await migrateDataDirectory(target, ctx.db, ctx.dataDir);
    logger.info('Relaunching after data directory change');
    setTimeout(() => {
      app.relaunch();
      app.exit(0);
    }, 350);
    return { restarting: true };
  });
}
