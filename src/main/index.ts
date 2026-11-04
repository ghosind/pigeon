/** Electron main entry: lifecycle, security defaults and service composition. */
import { app, BrowserWindow, dialog, session } from 'electron';
import { initializeDataDirectory } from './services/data-dir';
import { initializeLogger, createLogger, flushLogs } from './utils/logger';
import { AppContext } from './context';
import { createMainWindow, installApplicationMenu, loadMainWindow } from './window';
import { registerIpc } from './ipc';

app.setName('Pigeon');
app.setAppUserModelId('com.ghosind.pigeon');

const logger = createLogger('main');
let context: AppContext | null = null;
let mainWindow: BrowserWindow | null = null;

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(async () => {
    installApplicationMenu(!app.isPackaged);
    session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(false));
    try {
      const state = await initializeDataDirectory();
      await initializeLogger(state.dir);
      logger.info('Pigeon starting', {
        version: app.getVersion(),
        electron: process.versions.electron,
        platform: process.platform
      });
      context = new AppContext(state.dir);
      mainWindow = createMainWindow();
      registerIpc(context, (event) => Boolean(mainWindow && event.sender === mainWindow.webContents));
      mainWindow.on('closed', () => {
        mainWindow = null;
      });
      await loadMainWindow(mainWindow);
    } catch (error) {
      logger.error('Startup failed', { error: String(error) });
      await dialog.showMessageBox({
        type: 'error',
        title: 'Pigeon could not start',
        message: 'The application failed to initialize.',
        detail: error instanceof Error ? error.message : String(error)
      });
      app.quit();
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0 && context) {
        mainWindow = createMainWindow();
        void loadMainWindow(mainWindow).catch((error) => logger.error('Unable to load window', { error: String(error) }));
      }
    });
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('before-quit', () => {
    void flushLogs();
  });

  app.on('will-quit', () => {
    context?.close();
    context = null;
  });

  process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error.message, stack: error.stack });
  });
  process.on('unhandledRejection', (error) => {
    logger.error('Unhandled rejection', { error: error instanceof Error ? error.message : String(error) });
  });
}
