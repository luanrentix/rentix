const fs = require('node:fs');
const path = require('node:path');
const { Client } = require('pg');
const { config } = require('dotenv');

const backend = path.resolve(__dirname, '..');
config({ path: path.join(backend, '.env'), quiet: true });
const placeholder = (value) => !value || ['USER:PASSWORD', 'HOST:PORT', 'PROJECT_REF', 'SENHA_DO_BANCO', 'HOST_DO_SUPABASE'].some((part) => value.includes(part));
if (fs.existsSync(path.join(backend, '.env.supabase')) && (process.env.CONTRX_USE_SUPABASE_ENV === 'true' || placeholder(process.env.DIRECT_URL) || placeholder(process.env.DATABASE_URL))) config({ path: path.join(backend, '.env.supabase'), override: true, quiet: true });

async function main() {
  const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;
  const url = new URL(connectionString);
  if (!['localhost', '127.0.0.1', '::1'].includes(url.hostname) || url.port !== '55432' || url.pathname !== '/contrx') throw new Error('Validação permitida somente no banco local contrx, porta 55432.');
  const client = new Client({ connectionString });
  await client.connect();
  try {
    const products = (await client.query('SELECT to_jsonb(p) AS data FROM "vendas_produtos" p')).rows.map((row) => row.data);
    const orders = (await client.query('SELECT to_jsonb(o) AS data FROM "vendas_pedidos" o')).rows.map((row) => row.data);
    const folder = path.join(backend, 'backups', 'vendas');
    fs.mkdirSync(folder, { recursive: true });
    const backup = path.join(folder, `antes-das-migracoes-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    fs.writeFileSync(backup, JSON.stringify({ products, orders }, null, 2));
    await client.query('BEGIN');
    try {
      for (const name of ['20261105120000_sales_integrity_and_financial_links', '20261105130000_sales_variants_returns_and_customer_credit']) {
        const sql = fs.readFileSync(path.join(backend, 'prisma', 'migrations', name, 'migration.sql'), 'utf8').replace(/^BEGIN;\s*/, '').replace(/COMMIT;\s*$/, '');
        await client.query(sql);
      }
      const migrated = (await client.query('SELECT "id", "estoque"::text AS stock, "estoque_reservado"::text AS reserved FROM "vendas_produtos"')).rows;
      for (const product of migrated) {
        const previous = products.find((row) => row.id === product.id);
        if (Math.abs(Number(previous.estoque) - (Number(product.stock) - Number(product.reserved))) > 0.00001) throw new Error('A migração alterou o estoque disponível de um produto.');
      }
      console.log(JSON.stringify({ validacao: 'APROVADA', modo: 'ROLLBACK', produtos: products.length, documentos: orders.length, backup }));
    } finally {
      await client.query('ROLLBACK');
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => { console.error(error.message); process.exitCode = 1; });
