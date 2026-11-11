'use strict';

const { execFileSync } = require('node:child_process');

const releasePaths = [
  '.dockerignore',
  '.agents/skills/contrx_validation_protocol/SKILL.md',
  'app/layout.tsx',
  'app/vendas/page.tsx',
  'app/vendas/payment-panel.tsx',
  'app/vendas/product-price-history.tsx',
  'app/vendas/produtos-panel.tsx',
  'app/vendas/sale-receipt-modal.tsx',
  'app/vendas/price-composition-modal.tsx',
  'components/PrivateRoute.tsx',
  'constants/release-notes.ts',
  'contrx-backend/package-lock.json',
  'contrx-backend/package.json',
  'contrx-backend/prisma/schema.prisma',
  'contrx-backend/prisma/migrations/20261111120000_sales_product_price_composition',
  'contrx-backend/prisma/migrations/20261111150000_sales_order_number_reservations',
  'contrx-backend/prisma/migrations/20261111170000_sales_price_composition_template',
  'contrx-backend/prisma/migrations/20261111180000_sales_reservation_backend_rls',
  'contrx-backend/src/vendas/dto/criar-venda.dto.ts',
  'contrx-backend/src/vendas/dto/salvar-composicao-preco-produto.dto.ts',
  'contrx-backend/src/vendas/grid-products.ts',
  'contrx-backend/src/vendas/price-composition.spec.ts',
  'contrx-backend/src/vendas/price-composition.ts',
  'contrx-backend/src/vendas/vendas.controller.ts',
  'contrx-backend/src/vendas/vendas.service.spec.ts',
  'contrx-backend/src/vendas/vendas.service.ts',
  'docs/auditoria-performance-2026-11-11.md',
  'next.config.ts',
  'package-lock.json',
  'package.json',
  'proxy.ts',
  'services/vendas.service.ts',
  'services/sales-receipt.ts',
  'scripts/stage-release-1.0.24.cjs',
  'scripts/stage-release-1.0.23.cjs',
  'ATUALIZA-VERSAO-VALIDADA.BAT',
  'deploy-vps.bat',
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
const unexpected = before.filter(({ index, path }) => index !== ' ' && index !== '?' || !isAllowed(path));
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
  console.log(`Preflight da release 1.0.24 aprovado: ${changed.length} caminhos autorizados.`);
  for (const file of changed) console.log(`  ${file}`);
  process.exit(0);
}

git(['add', '--', ...changed]);
console.log(`Arquivos da release 1.0.24 adicionados: ${changed.length}`);
