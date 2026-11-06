require('dotenv/config');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  const schema = `price_history_${randomUUID().replaceAll('-', '')}`;
  const c = new Client({ connectionString: url.toString() });
  await c.connect();
  try {
    await c.query(`CREATE SCHEMA "${schema}"`);
    await c.query(`CREATE TABLE "${schema}".usuarios (id TEXT, empresa_id TEXT, nome TEXT)`);
    await c.query(`INSERT INTO "${schema}".usuarios VALUES ('user-A','A','OPERADOR')`);
    await c.query(`CREATE TABLE "${schema}".vendas_produtos (id TEXT PRIMARY KEY, empresa_id TEXT NOT NULL, preco NUMERIC, custo_compra NUMERIC, custo_adicional NUMERIC, markup_multiplicador NUMERIC, preco_promocional NUMERIC, estoque INTEGER DEFAULT 0, UNIQUE(id,empresa_id))`);
    const sql = fs.readFileSync(path.resolve(__dirname, '../prisma/migrations/20261106200000_product_price_history_permissions/migration.sql'), 'utf8').replaceAll('public.', `"${schema}".`);
    await c.query(sql);
    await c.query('BEGIN');
    await c.query("SELECT set_config('contrx.price_actor_id','user-A',true)");
    await c.query(`INSERT INTO "${schema}".vendas_produtos(id,empresa_id,preco,custo_compra,custo_adicional,markup_multiplicador) VALUES ('produto','A',100,50,0,2)`);
    await c.query('COMMIT');
    const initial = (await c.query(`SELECT * FROM "${schema}".vendas_produtos_historico_precos`)).rows[0];
    assert.equal(initial.usuario_nome, 'OPERADOR');
    assert.equal(initial.valores_anteriores, null);
    assert.equal(initial.valores_atuais.price, 100);
    await c.query(`UPDATE "${schema}".vendas_produtos SET estoque=3, preco=100 WHERE id='produto'`);
    assert.equal((await c.query(`SELECT count(*)::int AS total FROM "${schema}".vendas_produtos_historico_precos`)).rows[0].total, 1);
    await c.query('BEGIN');
    await c.query(`UPDATE "${schema}".vendas_produtos SET preco=200 WHERE id='produto'`);
    await c.query('ROLLBACK');
    assert.equal((await c.query(`SELECT count(*)::int AS total FROM "${schema}".vendas_produtos_historico_precos`)).rows[0].total, 1);
    await c.query(`UPDATE "${schema}".vendas_produtos SET preco=150 WHERE id='produto'`);
    const changed = (await c.query(`SELECT * FROM "${schema}".vendas_produtos_historico_precos WHERE valores_anteriores IS NOT NULL`)).rows[0];
    assert.equal(changed.valores_anteriores.price, 100);
    assert.equal(changed.valores_atuais.price, 150);
    assert.equal(changed.usuario_id, null);
    assert.equal((await c.query(`SELECT permite_desconto,permite_acrescimo FROM "${schema}".vendas_produtos`)).rows[0].permite_desconto, true);
    assert.equal((await c.query(`SELECT relrowsecurity FROM pg_class WHERE oid='"${schema}".vendas_produtos_historico_precos'::regclass`)).rows[0].relrowsecurity, true);
    console.log('PASS: usuario, valores antes/depois, sem duplicar alteracao de estoque, rollback atomico, permissoes padrao e RLS.');
  } finally {
    await c.query('ROLLBACK');
    await c.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await c.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
