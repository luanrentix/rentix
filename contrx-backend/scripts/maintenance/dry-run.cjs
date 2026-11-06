'use strict';
require('./controlled-cleanup.cjs').main(['dry-run', ...process.argv.slice(2)]).catch(() => { console.error('Simulation initialization failed. Check explicit environment privately.'); process.exitCode = 1; });
