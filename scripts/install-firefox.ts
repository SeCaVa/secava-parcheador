import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

// A project-local installation avoids the Windows activation-context failure
// observed when Firefox is started from the shared AppData browser cache.
const result = spawnSync(process.execPath, [resolve('node_modules/playwright/cli.js'), 'install', '--with-deps', 'firefox'], {
  stdio: 'inherit',
  env: { ...process.env, PLAYWRIGHT_BROWSERS_PATH: resolve('.cache/playwright') }
});
if (result.error) throw result.error;
process.exitCode = result.status ?? 1;
