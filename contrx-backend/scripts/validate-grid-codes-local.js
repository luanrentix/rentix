require('dotenv/config');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  const schema = `grid_codes_${randomUUID().replaceAll('-', '')}`;
  const c = new Client({ connectionString: url.toString() });
  await c.connect();
  try {
    await c.query(`CREATE SCHEMA "${schema}"`);
    await c.query(`CREATE TABLE "${schema}".vendas_produtos (id TEXT PRIMARY KEY, empresa_id TEXT, codigo TEXT, produto_grade_id TEXT, valor_grade TEXT, estoque INTEGER DEFAULT 0, UNIQUE(empresa_id,codigo))`);
    await c.query(`INSERT INTO "${schema}".vendas_produtos (id,empresa_id,codigo,produto_grade_id,valor_grade,estoque) VALUES ('pai','A','5',null,null,0), ('m','A','6','pai','M',3), ('g','A','7','pai','G',2), ('outra','B','5-M',null,null,0)`);
    const sql = fs.readFileSync(path.resolve(__dirname, '../prisma/migrations/20261106190000_grid_product_codes/migration.sql'), 'utf8').replaceAll('public.', `"${schema}".`);
    await c.query(sql);
    assert.deepEqual((await c.query(`SELECT codigo,estoque FROM "${schema}".vendas_produtos WHERE empresa_id='A' AND produto_grade_id='pai' ORDER BY codigo`)).rows, [{ codigo: '5-G', estoque: 2 }, { codigo: '5-M', estoque: 3 }]);
    await c.query(`INSERT INTO "${schema}".vendas_produtos (id,empresa_id,produto_grade_id,valor_grade) VALUES ('azul','A','pai',' azul ')`);
    assert.equal((await c.query(`SELECT codigo FROM "${schema}".vendas_produtos WHERE id='azul'`)).rows[0].codigo, '5-AZUL');
    await c.query(`UPDATE "${schema}".vendas_produtos SET codigo='9' WHERE id='pai'`);
    assert.equal((await c.query(`SELECT codigo FROM "${schema}".vendas_produtos WHERE id='m'`)).rows[0].codigo, '9-M');
    await assert.rejects(c.query(`INSERT INTO "${schema}".vendas_produtos (id,empresa_id,produto_grade_id,valor_grade) VALUES ('duplicado','A','pai','M')`), { code: '23505' });
    assert.equal((await c.query(`SELECT codigo FROM "${schema}".vendas_produtos WHERE id='outra'`)).rows[0].codigo, '5-M');
    console.log('PASS: migracao, estoque preservado, tamanho/cor, renumeracao da matriz, isolamento e duplicidade.');
  } finally {
    await c.query('ROLLBACK');
    await c.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await c.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
