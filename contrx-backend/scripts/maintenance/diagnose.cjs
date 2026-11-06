'use strict';
require('./controlled-cleanup.cjs').main(['diagnose', ...process.argv.slice(2)]).catch(() => { console.error('Diagnosis initialization failed. Check explicit environment privately.'); process.exitCode = 1; });
