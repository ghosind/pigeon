/**
 * The cloud integration seam. The local release deliberately ships a concrete
 * "not implemented" adapter so future providers can be added without touching
 * IPC or UI code.
 */
import type {
  CloudCollectionDescriptor,
  CloudConnectionStatus,
  CloudSyncAdapter
} from '@shared/types';
import { AppError } from '../utils/errors';
import { createLogger } from '../utils/logger';

const logger = createLogger('cloud-sync');

function notImplemented(): never {
  throw new AppError('CLOUD_NOT_IMPLEMENTED', 'Cloud sync is not implemented in this release');
}

export class LocalOnlyCloudSyncAdapter implements CloudSyncAdapter {
  readonly provider = 'local';

  async status(): Promise<CloudConnectionStatus> {
    return {
      connected: false,
      provider: this.provider,
      message: 'Cloud sync is reserved for a future release. All data stays local.'
    };
  }

  async login(): Promise<CloudConnectionStatus> {
    logger.info('Cloud login requested but the provider is disabled');
    return notImplemented();
  }

  async listCollections(): Promise<CloudCollectionDescriptor[]> {
    return notImplemented();
  }

  async pullCollection(): Promise<unknown> {
    return notImplemented();
  }

  async pushCollection(): Promise<{ cloudId: string; syncVersion: number }> {
    return notImplemented();
  }

  async pullEnvironment(): Promise<unknown> {
    return notImplemented();
  }

  async pushEnvironment(): Promise<{ cloudId: string; syncVersion: number }> {
    return notImplemented();
  }
}
