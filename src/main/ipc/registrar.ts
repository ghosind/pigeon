import { ipcMain, type IpcMainInvokeEvent } from 'electron';
import type { ZodType } from 'zod';
import type { ApiResult } from '@shared/types';
import { toApiError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('ipc');

export type TrustedCheck = (event: IpcMainInvokeEvent) => boolean;
export type IpcHandler<TInput, TOutput> = (input: TInput, event: IpcMainInvokeEvent) => TOutput | Promise<TOutput>;

export class IpcRegistrar {
  constructor(private readonly isTrusted: TrustedCheck) {}

  handle<TInput, TOutput>(
    channel: string,
    schema: ZodType<TInput> | null,
    handler: IpcHandler<TInput, TOutput>
  ): void {
    ipcMain.handle(channel, async (event, rawInput): Promise<ApiResult<TOutput>> => {
      try {
        if (!this.isTrusted(event)) {
          logger.warn('Rejected IPC from an untrusted sender', { channel });
          return { ok: false, error: { code: 'VALIDATION_ERROR', message: 'Untrusted IPC sender' } };
        }
        const input = (schema ? schema.parse(rawInput) : (undefined as TInput));
        const data = await handler(input, event);
        return { ok: true, data };
      } catch (error) {
        logger.warn('IPC handler failed', {
          channel,
          error: error instanceof Error ? error.message : String(error)
        });
        return { ok: false, error: toApiError(error) };
      }
    });
  }
}
