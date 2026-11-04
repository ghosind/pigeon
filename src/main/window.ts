import { BrowserWindow, Menu, shell, type MenuItemConstructorOptions } from 'electron';
import path from 'node:path';
import icon from '../../resources/icon.png?asset&asarUnpack';
import { createLogger } from './utils/logger';

const logger = createLogger('window');

export function createMainWindow(): BrowserWindow {
  const isMac = process.platform === 'darwin';
  const window = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1040,
    minHeight: 680,
    show: false,
    backgroundColor: '#F7F6F3',
    title: 'Pigeon — API Studio',
    titleBarStyle: isMac ? 'hiddenInset' : 'default',
    trafficLightPosition: isMac ? { x: 16, y: 18 } : undefined,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      spellcheck: false,
      devTools: true
    }
  });

  window.once('ready-to-show', () => window.show());
  window.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//i.test(url)) void shell.openExternal(url);
    return { action: 'deny' };
  });
  window.webContents.on('will-navigate', (event, url) => {
    const devUrl = process.env.ELECTRON_RENDERER_URL;
    if (devUrl && url.startsWith(devUrl)) return;
    if (url.startsWith('file://')) return;
    event.preventDefault();
  });
  window.webContents.on('render-process-gone', (_event, details) => {
    logger.error('Renderer process gone', details);
  });

  window.webContents.on('did-fail-load', (_event, code, description, url) => {
    logger.error('Renderer failed to load', { code, description, url });
  });
  logger.info('Main window created', { isMac });
  return window;
}

/** Loads the renderer after IPC handlers are registered. */
export async function loadMainWindow(window: BrowserWindow): Promise<void> {
  if (process.env.ELECTRON_RENDERER_URL) {
    await window.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    await window.loadFile(path.join(__dirname, '../renderer/index.html'));
  }
}

export function installApplicationMenu(isDev: boolean): void {
  const isMac = process.platform === 'darwin';
  const template: MenuItemConstructorOptions[] = [];
  if (isMac) {
    template.push({
      label: 'Pigeon',
      submenu: [
        { role: 'about' },
        { type: 'separator' },
        { role: 'hide' },
        { role: 'hideOthers' },
        { role: 'unhide' },
        { type: 'separator' },
        { role: 'quit' }
      ]
    });
  }
  template.push(
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' },
        { role: 'redo' },
        { type: 'separator' },
        { role: 'cut' },
        { role: 'copy' },
        { role: 'paste' },
        { role: 'selectAll' }
      ]
    },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        ...(isDev ? [{ role: 'forceReload' as const }, { role: 'toggleDevTools' as const }] : []),
        { type: 'separator' },
        { role: 'resetZoom' },
        { role: 'zoomIn' },
        { role: 'zoomOut' },
        { type: 'separator' },
        { role: 'togglefullscreen' }
      ]
    },
    {
      label: 'Window',
      submenu: [{ role: 'minimize' }, { role: 'zoom' }]
    }
  );
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
