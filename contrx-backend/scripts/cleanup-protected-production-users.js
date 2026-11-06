// Legacy maintenance retired; never infer production environment or delete data automatically.
console.error('Procedimento antigo desativado. Use scripts/maintenance/diagnose.cjs, dry-run.cjs ou execute.cjs com --env explicito. Consulte docs/limpeza-controlada.md.');
process.exitCode = 1;
