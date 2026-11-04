/** Typed, minimal bridge. No Node modules or arbitrary channel access leak. */
import { contextBridge, ipcRenderer } from 'electron';
import { IPC, type PigeonApi } from '@shared/ipc';

const invoke = <T>(channel: string, payload?: unknown): Promise<T> => ipcRenderer.invoke(channel, payload);

const api: PigeonApi = {
  app: {
    info: () => invoke(IPC.appInfo),
    relaunch: () => invoke(IPC.appRelaunch),
    openExternal: (url) => invoke(IPC.appOpenExternal, url),
    showItemInFolder: (path) => invoke(IPC.appShowItem, path)
  },
  collections: {
    snapshot: () => invoke(IPC.collectionSnapshot),
    create: (input) => invoke(IPC.collectionCreate, input),
    update: (input) => invoke(IPC.collectionUpdate, input),
    remove: (id) => invoke(IPC.collectionDelete, id),
    reorder: (parentId, orderedIds) => invoke(IPC.collectionReorder, { parentId, orderedIds }),
    move: (id, kind, parentId) => invoke(IPC.collectionMove, { id, kind, parentId })
  },
  requests: {
    create: (input) => invoke(IPC.requestCreate, input),
    update: (input) => invoke(IPC.requestUpdate, input),
    remove: (id) => invoke(IPC.requestDelete, id),
    duplicate: (id) => invoke(IPC.requestDuplicate, id)
  },
  env: {
    list: () => invoke(IPC.envList),
    create: (input) => invoke(IPC.envCreate, input),
    update: (input) => invoke(IPC.envUpdate, input),
    remove: (id) => invoke(IPC.envDelete, id),
    activate: (id) => invoke(IPC.envActivate, id),
    reveal: (input) => invoke(IPC.envReveal, input),
    globals: () => invoke(IPC.envGlobals),
    saveGlobals: (variables) => invoke(IPC.envSaveGlobals, variables)
  },
  history: {
    list: (query) => invoke(IPC.historyList, query),
    remove: (id) => invoke(IPC.historyDelete, id),
    clear: () => invoke(IPC.historyClear)
  },
  request: {
    send: (payload) => invoke(IPC.requestSend, payload),
    cancel: (requestId) => invoke(IPC.requestCancel, requestId)
  },
  response: {
    readText: (input) => invoke(IPC.responseReadText, input),
    saveAs: (input) => invoke(IPC.responseSaveAs, input)
  },
  transfer: {
    importPostman: () => invoke(IPC.transferImportPostman),
    importHar: () => invoke(IPC.transferImportHar),
    importEnvironment: () => invoke(IPC.transferImportEnvironment),
    importBackup: () => invoke(IPC.transferImportBackup),
    exportPostman: (input) => invoke(IPC.transferExportPostman, input),
    exportHar: (input) => invoke(IPC.transferExportHar, input),
    exportBackup: () => invoke(IPC.transferExportBackup)
  },
  workspaces: {
    list: () => invoke(IPC.workspaceList),
    create: (name) => invoke(IPC.workspaceCreate, name),
    rename: (id, name) => invoke(IPC.workspaceRename, { id, name }),
    activate: (id) => invoke(IPC.workspaceActivate, id),
    remove: (id) => invoke(IPC.workspaceDelete, id)
  },
  settings: {
    get: () => invoke(IPC.settingsGet),
    save: (preference) => invoke(IPC.settingsSave, preference),
    pickFile: (input) => invoke(IPC.settingsPickFile, input),
    pickDirectory: () => invoke(IPC.settingsPickDirectory),
    changeDataDir: (path) => invoke(IPC.settingsChangeDataDir, path)
  },
  sync: {
    status: () => invoke(IPC.syncStatus),
    login: () => invoke(IPC.syncLogin),
    list: () => invoke(IPC.syncList),
    push: (input) => invoke(IPC.syncPush, input),
    pull: (input) => invoke(IPC.syncPull, input)
  }
};

contextBridge.exposeInMainWorld('pigeon', api);
