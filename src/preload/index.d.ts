import type { PigeonApi } from '@shared/ipc';

declare global {
  interface Window {
    pigeon: PigeonApi;
  }
}

export {};
