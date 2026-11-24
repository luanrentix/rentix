'use strict';

const { execFileSync } = require('node:child_process');

const releasePaths = [
  '.gitignore',
  '.agents/skills/contrx_validation_protocol/SKILL.md',
  'ATUALIZA-VERSAO-VALIDADA.BAT',
  'deploy-vps.bat',
  'app/estoque',
  'app/configuracoes/page.tsx',
  'app/globals.css',
  'app/layout.tsx',
  'app/vendas/card-payment-modal.tsx',
  'app/vendas/creditos-panel.tsx',
  'app/vendas/estornos-panel.tsx',
  'app/vendas/mixed-payment-modal.tsx',
  'app/vendas/order-list-filters.tsx',
  'app/vendas/page.tsx',
  'app/vendas/payment-panel.tsx',
  'app/vendas/product-history.tsx',
  'app/vendas/produtos-panel.tsx',
  'components/layout/app-shell.tsx',
  'components/system-error-reporter.tsx',
  'constants/release-notes.ts',
  'contrx-backend/package.json',
  'contrx-backend/prisma/schema.prisma',
  'contrx-backend/prisma/migrations/20261123093000_sales_credit_vouchers',
  'contrx-backend/prisma/migrations/20261123150000_sales_product_history',
  'contrx-backend/prisma/migrations/20261123153000_commercial_documents_in_progress',
  'contrx-backend/prisma/migrations/20261123160000_budget_expiration',
  'contrx-backend/scripts/manual-supabase-update.cjs',
  'contrx-backend/scripts/create-error-table.ts',
  'contrx-backend/.env.supabase.example',
  'contrx-backend/scripts/lib/release-backup.cjs',
  'contrx-backend/scripts/maintenance/controlled-cleanup.cjs',
  'contrx-backend/src/vendas/card-payment.ts',
  'contrx-backend/src/vendas/dto/atualizar-produto-venda.dto.ts',
  'contrx-backend/src/vendas/dto/criar-venda.dto.ts',
  'contrx-backend/src/vendas/order-list-filter.spec.ts',
  'contrx-backend/src/vendas/vendas.controller.ts',
  'contrx-backend/src/vendas/vendas.service.spec.ts',
  'contrx-backend/src/vendas/vendas.service.ts',
  'docs/PROTOCOLO_MASTER.md',
  'package.json',
  'services/app-routes.ts',
  'services/business-navigation.ts',
  'services/sales-cards.ts',
  'services/system-logs.service.ts',
  'services/vendas.service.ts',
  'scripts/stage-release-1.0.26.cjs',
  'scripts/stage-release-1.0.25.cjs',
];

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'inherit'] });
}

function readStatus() {
  return git(['status', '--porcelain=v1', '-z'])
    .split('\0')
    .filter(Boolean)
    .map((entry) => ({ index: entry[0], worktree: entry[1], path: entry.slice(3).replaceAll('\\', '/') }));
}

function isAllowed(file) {
  return releasePaths.some((allowed) => file === allowed || file.startsWith(`${allowed}/`));
}

const before = readStatus();
// Arquivos previstos podem estar tanto no diretório de trabalho quanto já
// preparados no índice pelo fluxo de release. O que deve bloquear é somente
// um caminho fora da lista aprovada.
const unexpected = before.filter(({ path }) => !isAllowed(path));
if (unexpected.length) {
  console.error('Release interrompida. Revise estas alteracoes fora da lista aprovada:');
  for (const entry of unexpected) console.error(`  ${entry.index}${entry.worktree} ${entry.path}`);
  process.exit(1);
}

const changed = [...new Set(before.map(({ path }) => path))];
if (!changed.length) {
  console.log('Nenhuma alteracao local para adicionar.');
  process.exit(0);
}

if (process.argv.includes('--dry-run')) {
  console.log(`Preflight da release 1.0.26 aprovado: ${changed.length} caminhos autorizados.`);
  for (const file of changed) console.log(`  ${file}`);
  process.exit(0);
}

git(['add', '--', ...changed]);
console.log(`Arquivos da release 1.0.26 adicionados: ${changed.length}`);
