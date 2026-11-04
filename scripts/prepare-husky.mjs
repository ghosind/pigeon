import { existsSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

if (!existsSync('.git')) {
  console.log('[husky] No .git directory; skipping hook installation.');
  process.exit(0);
}
const command = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';
const result = spawnSync(command, ['exec', 'husky'], { stdio: 'inherit', shell: process.platform === 'win32' });
if (result.error || result.status !== 0) {
  console.warn('[husky] Hook installation failed; continuing.', result.error?.message ?? '');
}
process.exit(0);
