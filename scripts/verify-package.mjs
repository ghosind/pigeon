/**
 * Verifies that packaging produced a self-contained app with the required
 * runtime assets and without development/test directories.
 *
 * Usage: node scripts/verify-package.mjs [path/to/app.asar]
 * When no path is given, the first app.asar under release/ is used.
 */
import { existsSync, readdirSync, statSync } from 'node:fs';
import { createRequire } from 'node:module';
import { join, resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { listPackage } = require('@electron/asar');

const root = process.cwd();
const buildResources = [
  'build/icon.icns',
  'build/icon.ico',
  'build/icon.png',
  'build/entitlements.mac.plist',
  'resources/icon.png'
];
const missingResources = buildResources.filter((file) => !existsSync(join(root, file)));
if (missingResources.length > 0) {
  console.error(`Missing build resources: ${missingResources.join(', ')}`);
  process.exit(1);
}

function findAsar(directory) {
  for (const entry of readdirSync(directory)) {
    const target = join(directory, entry);
    const info = statSync(target);
    if (info.isDirectory()) {
      const found = findAsar(target);
      if (found) return found;
    } else if (entry === 'app.asar') {
      return target;
    }
  }
  return null;
}

const asarPath = process.argv[2] ? resolve(process.argv[2]) : findAsar(join(root, 'release'));
if (!asarPath || !existsSync(asarPath)) {
  console.error('No packaged app.asar found; run "pnpm build:unpack" first.');
  process.exit(1);
}

const entries = listPackage(asarPath).map((entry) => entry.replace(/\\/g, '/'));
const required = [
  '/package.json',
  '/LICENSE',
  '/out/main/index.js',
  '/out/preload/index.js',
  '/out/renderer/index.html',
  '/out/renderer/logo.svg',
  '/resources/icon.png'
];
const missing = required.filter((file) => !entries.includes(file));
if (missing.length > 0) {
  console.error(`Packaged app is missing: ${missing.join(', ')}`);
  process.exit(1);
}

const forbidden = ['/src/', '/tests/', '/docs/', '/scripts/', '/build/', '/.pnpm-store', '/.electron-cache', '/.npm-cache'];
const leaked = entries.filter((entry) => forbidden.some((prefix) => entry.startsWith(prefix)));
if (leaked.length > 0) {
  console.error(`Packaged app contains development files (${leaked.length}), e.g. ${leaked.slice(0, 5).join(', ')}`);
  process.exit(1);
}

console.log(`Package verified: ${asarPath} (${entries.length} entries).`);
