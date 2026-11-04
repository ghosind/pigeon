import { z } from 'zod';
import { IPC } from '@shared/ipc';
import type { EnvironmentVariable } from '@shared/types';
import type { AppContext } from '../context';
import { environmentVariableSchema, requestDefinitionSchema } from '../utils/validation';
import type { IpcRegistrar } from './registrar';

const idSchema = z.string().min(1).max(120);
const variablesSchema = z.array(environmentVariableSchema).max(2000);

export function registerWorkspaceIpc(ipc: IpcRegistrar, ctx: AppContext): void {
  ipc.handle(IPC.workspaceList, null, () => ctx.workspaces.list());
  ipc.handle(IPC.workspaceCreate, z.string().min(1).max(200), (name) => ctx.workspaces.create(name));
  ipc.handle(
    IPC.workspaceRename,
    z.object({ id: idSchema, name: z.string().min(1).max(200) }),
    (input) => ctx.workspaces.rename(input.id, input.name)
  );
  ipc.handle(IPC.workspaceActivate, idSchema, (id) => ctx.workspaces.activate(id));
  ipc.handle(IPC.workspaceDelete, idSchema, (id) => ctx.workspaces.delete(id));

  ipc.handle(IPC.collectionSnapshot, null, () => ctx.collections.snapshot());

  ipc.handle(
    IPC.collectionCreate,
    z.object({ name: z.string().min(1).max(500), parentId: z.string().nullable(), type: z.enum(['collection', 'folder']) }),
    (input) => ctx.collections.create(input)
  );

  ipc.handle(
    IPC.collectionUpdate,
    z.object({
      id: idSchema,
      patch: z.object({
        name: z.string().min(1).max(500).optional(),
        description: z.string().max(10000).optional(),
        preRequestScript: z.string().max(500000).optional(),
        testScript: z.string().max(500000).optional()
      })
    }),
    (input) => ctx.collections.update(input)
  );

  ipc.handle(IPC.collectionDelete, idSchema, (id) => {
    ctx.collections.delete(id);
    return null;
  });

  ipc.handle(
    IPC.collectionReorder,
    z.object({ parentId: z.string().nullable(), orderedIds: z.array(idSchema).max(10000) }),
    (input) => {
      ctx.collections.reorder(input.parentId, input.orderedIds);
      return null;
    }
  );

  ipc.handle(
    IPC.collectionMove,
    z.object({ id: idSchema, kind: z.enum(['node', 'request']), parentId: z.string().nullable() }),
    (input) => {
      ctx.collections.move(input.id, input.kind, input.parentId);
      return null;
    }
  );

  ipc.handle(
    IPC.requestCreate,
    z.object({
      collectionId: idSchema,
      name: z.string().max(500).optional(),
      request: requestDefinitionSchema.partial().optional()
    }),
    (input) => ctx.requests.create(input as Parameters<typeof ctx.requests.create>[0])
  );

  ipc.handle(
    IPC.requestUpdate,
    z.object({ id: idSchema, patch: requestDefinitionSchema.partial() }),
    (input) => ctx.requests.update(input as unknown as Parameters<typeof ctx.requests.update>[0])
  );

  ipc.handle(IPC.requestDelete, idSchema, (id) => {
    ctx.requests.delete(id);
    return null;
  });

  ipc.handle(IPC.requestDuplicate, idSchema, (id) => ctx.requests.duplicate(id));

  ipc.handle(IPC.envList, null, () => ctx.environments.list());

  ipc.handle(
    IPC.envCreate,
    z.object({ name: z.string().min(1).max(500), variables: variablesSchema.optional() }),
    (input) => ctx.environments.create(input)
  );

  ipc.handle(
    IPC.envUpdate,
    z.object({ id: idSchema, name: z.string().min(1).max(500).optional(), variables: variablesSchema.optional() }),
    (input) => ctx.environments.update(input as Parameters<typeof ctx.environments.update>[0])
  );

  ipc.handle(IPC.envDelete, idSchema, (id) => {
    ctx.environments.delete(id);
    return null;
  });

  ipc.handle(IPC.envActivate, idSchema, (id) => ctx.environments.activate(id));

  ipc.handle(
    IPC.envReveal,
    z.object({ environmentId: z.string().nullable(), key: z.string().min(1).max(10000) }),
    (input) => ctx.environments.reveal(input)
  );

  ipc.handle(IPC.envGlobals, null, () => ctx.environments.globals());

  ipc.handle(IPC.envSaveGlobals, variablesSchema, (variables: EnvironmentVariable[]) =>
    ctx.environments.saveGlobals(variables)
  );

  ipc.handle(
    IPC.historyList,
    z.object({
      search: z.string().max(500).optional(),
      limit: z.number().int().min(1).max(200).optional(),
      offset: z.number().int().min(0).optional()
    }),
    (input) => ctx.history.list(input)
  );

  ipc.handle(IPC.historyDelete, idSchema, (id) => {
    ctx.history.delete(id);
    return null;
  });

  ipc.handle(IPC.historyClear, null, () => {
    ctx.history.clear();
    return null;
  });

  ipc.handle(IPC.syncStatus, null, () => ctx.cloudSync.status());
  ipc.handle(IPC.syncLogin, null, () => ctx.cloudSync.login());
  ipc.handle(IPC.syncList, null, () => ctx.cloudSync.listCollections());
  ipc.handle(IPC.syncPush, null, () => ctx.cloudSync.pushCollection());
  ipc.handle(IPC.syncPull, null, () => ctx.cloudSync.pullCollection());
}
