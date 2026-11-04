import { z } from 'zod';
import { BrowserWindow, dialog, type FileFilter, type IpcMainInvokeEvent } from 'electron';
import { readFile, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { IPC } from '@shared/ipc';
import type { ImportSummary } from '@shared/types';
import type { AppContext } from '../context';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';
import { parsePostmanEnvironment } from '../services/transfer/postman-import';
import type { IpcRegistrar } from './registrar';

const logger = createLogger('transfer-ipc');
const MAX_IMPORT_BYTES = 80 * 1024 * 1024;
const exportSchema = z.object({ collectionId: z.string().max(120).optional() }).optional();

function safeName(value: string, fallback: string): string {
  return value.replace(/[\\/:*?"<>|]/g, '_').slice(0, 120) || fallback;
}

async function openJson(event: IpcMainInvokeEvent, filters: FileFilter[]): Promise<{ raw: unknown; filePath: string } | null> {
  const window = BrowserWindow.fromWebContents(event.sender);
  const options = { title: 'Import', properties: ['openFile' as const], filters };
  const result = window ? await dialog.showOpenDialog(window, options) : await dialog.showOpenDialog(options);
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  const info = await stat(filePath);
  if (info.size > MAX_IMPORT_BYTES) {
    throw new AppError('IMPORT_ERROR', 'The selected file is larger than 80 MB');
  }
  try {
    const raw = JSON.parse(await readFile(filePath, 'utf8')) as unknown;
    return { raw, filePath };
  } catch (error) {
    throw new AppError('IMPORT_ERROR', 'The selected file is not valid JSON', String(error));
  }
}

async function saveJson(
  event: IpcMainInvokeEvent,
  defaultName: string,
  data: unknown,
  filters: FileFilter[]
): Promise<string | null> {
  const window = BrowserWindow.fromWebContents(event.sender);
  const options = { title: 'Export', defaultPath: safeName(defaultName, 'pigeon-export.json'), filters };
  const result = window ? await dialog.showSaveDialog(window, options) : await dialog.showSaveDialog(options);
  if (result.canceled || !result.filePath) return null;
  await writeFile(result.filePath, JSON.stringify(data, null, 2), 'utf8');
  logger.info('Export written', { filePath: result.filePath });
  return result.filePath;
}

const JSON_FILTER: FileFilter = { name: 'JSON', extensions: ['json'] };
const POSTMAN_FILTER: FileFilter = { name: 'Postman collection', extensions: ['json'] };
const HAR_FILTER: FileFilter = { name: 'HTTP Archive', extensions: ['har', 'json'] };
const BACKUP_FILTER: FileFilter = { name: 'Pigeon backup', extensions: ['json'] };

function countCollections(ctx: AppContext, collectionId?: string): { collections: number; requests: number } {
  const snapshot = ctx.collections.snapshot();
  if (!collectionId) return { collections: snapshot.nodes.filter((node) => node.type === 'collection').length, requests: snapshot.requests.length };
  const ids = new Set<string>([collectionId]);
  let changed = true;
  while (changed) {
    changed = false;
    for (const node of snapshot.nodes) {
      if (node.parentId && ids.has(node.parentId) && !ids.has(node.id)) {
        ids.add(node.id);
        changed = true;
      }
    }
  }
  return { collections: 1, requests: snapshot.requests.filter((request) => ids.has(request.collectionId)).length };
}

export function registerTransferIpc(ipc: IpcRegistrar, ctx: AppContext): void {
  ipc.handle(IPC.transferImportPostman, null, async (_input, event) => {
    const file = await openJson(event, [POSTMAN_FILTER]);
    if (!file) return null;
    const result = ctx.postmanImporter.import(file.raw);
    logger.info('Postman import finished', result.summary);
    return result;
  });

  ipc.handle(IPC.transferImportHar, null, async (_input, event) => {
    const file = await openJson(event, [HAR_FILTER]);
    if (!file) return null;
    const result = ctx.harImporter.import(file.raw, path.basename(file.filePath));
    logger.info('HAR import finished', result.summary);
    return result;
  });

  ipc.handle(IPC.transferImportEnvironment, null, async (_input, event) => {
    const file = await openJson(event, [JSON_FILTER]);
    if (!file) return null;
    const parsed = parsePostmanEnvironment(file.raw);
    ctx.environments.create({ name: parsed.name, variables: parsed.variables });
    const summary: ImportSummary = {
      collections: 0,
      folders: 0,
      requests: 0,
      environments: 1,
      skipped: 0,
      warnings: parsed.warnings
    };
    return summary;
  });

  ipc.handle(IPC.transferImportBackup, null, async (_input, event) => {
    const file = await openJson(event, [BACKUP_FILTER]);
    if (!file) return null;
    const window = BrowserWindow.fromWebContents(event.sender);
    const confirmation = window
      ? await dialog.showMessageBox(window, {
          type: 'warning',
          title: 'Restore backup',
          message: 'Restore this backup?',
          detail: 'This replaces all local collections, environments and preferences with the backup contents.',
          buttons: ['Cancel', 'Restore'],
          defaultId: 0,
          cancelId: 0
        })
      : await dialog.showMessageBox({
          type: 'warning',
          title: 'Restore backup',
          message: 'Restore this backup?',
          detail: 'This replaces all local collections, environments and preferences.',
          buttons: ['Cancel', 'Restore'],
          defaultId: 0,
          cancelId: 0
        });
    if (confirmation.response !== 1) return null;
    const result = ctx.backup.restoreBackup(file.raw);
    logger.info('Backup restored', result.summary);
    return result;
  });

  ipc.handle(IPC.transferExportPostman, exportSchema, async (input, event) => {
    const document = ctx.postmanExporter.build(input?.collectionId);
    const filePath = await saveJson(event, 'pigeon-collection.postman.json', document, [POSTMAN_FILTER]);
    if (!filePath) return null;
    const counts = countCollections(ctx, input?.collectionId);
    return { path: filePath, ...counts };
  });

  ipc.handle(IPC.transferExportHar, exportSchema, async (input, event) => {
    const document = ctx.harExporter.build(input?.collectionId);
    const filePath = await saveJson(event, 'pigeon-collection.har', document, [HAR_FILTER]);
    if (!filePath) return null;
    const counts = countCollections(ctx, input?.collectionId);
    return { path: filePath, ...counts };
  });

  ipc.handle(IPC.transferExportBackup, null, async (_input, event) => {
    const document = ctx.backup.exportBackup();
    const filePath = await saveJson(event, `pigeon-backup-${new Date().toISOString().slice(0, 10)}.json`, document, [BACKUP_FILTER]);
    if (!filePath) return null;
    const counts = countCollections(ctx);
    const environments = ctx.environments.list().length;
    return { path: filePath, ...counts, environments };
  });
}
