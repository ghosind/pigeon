import type { AppContext } from '../context';
import type { TrustedCheck } from './registrar';
import { IpcRegistrar } from './registrar';
import { registerWorkspaceIpc } from './workspace';
import { registerRequestIpc } from './request';
import { registerSettingsIpc } from './settings';
import { registerSystemIpc } from './system';
import { registerTransferIpc } from './transfer';

export function registerIpc(context: AppContext, isTrusted: TrustedCheck): void {
  const ipc = new IpcRegistrar(isTrusted);
  registerSystemIpc(ipc, context);
  registerWorkspaceIpc(ipc, context);
  registerRequestIpc(ipc, context);
  registerSettingsIpc(ipc, context);
  registerTransferIpc(ipc, context);
}
