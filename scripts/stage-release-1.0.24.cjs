'use strict';

// Compatibility shim: every pending release now uses the validated 1.0.25 allowlist.
const { spawnSync } = require('node:child_process');
const { resolve } = require('node:path');

const result = spawnSync(
  process.execPath,
  [resolve(__dirname, 'stage-release-1.0.25.cjs'), ...process.argv.slice(2)],
  { stdio: 'inherit' },
);

process.exit(result.status ?? 1);
