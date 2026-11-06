'use strict';
require('./controlled-cleanup.cjs').main(['execute', ...process.argv.slice(2)]).catch(() => { console.error('Execution initialization failed. Check explicit environment privately.'); process.exitCode = 1; });
