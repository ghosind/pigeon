import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const alias = {
  '@shared': resolve('src/shared'),
  '@renderer': resolve('src/renderer/src'),
  'pigeon-worker-editor': resolve('node_modules/monaco-editor/esm/vs/editor/editor.worker.js'),
  'pigeon-worker-json': resolve('node_modules/monaco-editor/esm/vs/language/json/json.worker.js'),
  'pigeon-worker-css': resolve('node_modules/monaco-editor/esm/vs/language/css/css.worker.js'),
  'pigeon-worker-html': resolve('node_modules/monaco-editor/esm/vs/language/html/html.worker.js'),
  'pigeon-worker-ts': resolve('node_modules/monaco-editor/esm/vs/language/typescript/ts.worker.js')
};

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
    build: {
      rollupOptions: { input: { index: resolve('src/main/index.ts') } }
    }
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    resolve: { alias },
    build: {
      rollupOptions: { input: { index: resolve('src/preload/index.ts') } }
    }
  },
  renderer: {
    root: resolve('src/renderer'),
    plugins: [
      react(),
      {
        name: 'pigeon-dev-csp',
        transformIndexHtml(html, context) {
          // Vite injects an inline React Refresh preamble in dev only.
          return context.server ? html.replace("script-src 'self';", "script-src 'self' 'unsafe-inline';") : html;
        }
      }
    ],
    resolve: { alias },
    build: {
      rollupOptions: { input: resolve('src/renderer/index.html') }
    }
  }
});
