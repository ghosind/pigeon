import { z } from 'zod';
import { app, shell } from 'electron';
import { IPC } from '@shared/ipc';
import type { AppContext } from '../context';
import { AppError } from '../utils/errors';
import { dataDirState } from '../services/data-dir';
import type { IpcRegistrar } from './registrar';

export function registerSystemIpc(ipc: IpcRegistrar, ctx: AppContext): void {
  ipc.handle(IPC.appInfo, null, () => ({
    version: app.getVersion(),
    electronVersion: process.versions.electron ?? '',
    nodeVersion: process.versions.node,
    platform: process.platform,
    dataDir: ctx.dataDir,
    portable: dataDirState().portable
  }));

  ipc.handle(IPC.appRelaunch, null, () => {
    app.relaunch();
    app.exit(0);
    return null;
  });

  ipc.handle(IPC.appOpenExternal, z.string().url(), async (url) => {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new AppError('VALIDATION_ERROR', 'Only http(s) links can be opened externally');
    }
    await shell.openExternal(url);
    return null;
  });

  ipc.handle(IPC.appShowItem, z.string().min(1).max(8192), (target) => {
    shell.showItemInFolder(target);
    return null;
  });
}
