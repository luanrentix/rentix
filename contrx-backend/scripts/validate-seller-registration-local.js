require('dotenv/config');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');
async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  const schema = `seller_test_${randomUUID().replaceAll('-', '')}`;
  const c = new Client({ connectionString: url.toString() });
  await c.connect();
  try {
    await c.query(`CREATE SCHEMA "${schema}"`);
    await c.query(`CREATE TABLE "${schema}".vendas_vendedores (id TEXT PRIMARY KEY, empresa_id TEXT, cpf TEXT, UNIQUE(empresa_id,cpf))`);
    await c.query(`INSERT INTO "${schema}".vendas_vendedores VALUES ('pf','A','52998224725'), ('pj','A','55942978000164')`);
    await c.query(fs.readFileSync(path.resolve(__dirname, '../prisma/migrations/20261106210000_seller_registration/migration.sql'), 'utf8').replaceAll('public.', `"${schema}".`));
    assert.equal((await c.query(`SELECT tipo_pessoa FROM "${schema}".vendas_vendedores WHERE id='pf'`)).rows[0].tipo_pessoa, 'INDIVIDUAL');
    assert.equal((await c.query(`SELECT tipo_pessoa FROM "${schema}".vendas_vendedores WHERE id='pj'`)).rows[0].tipo_pessoa, 'COMPANY');
    await assert.rejects(c.query(`INSERT INTO "${schema}".vendas_vendedores(id,empresa_id,cpf) VALUES ('duplicado','A','55942978000164')`), { code: '23505' });
    await c.query(`INSERT INTO "${schema}".vendas_vendedores(id,empresa_id,cpf,tipo_pessoa) VALUES ('outra','B','55942978000164','COMPANY')`);
    await c.query(`UPDATE "${schema}".vendas_vendedores SET endereco='RUA TESTE',cidade='MANAUS' WHERE id='pj'`);
    assert.equal((await c.query(`SELECT count(*)::int AS total FROM "${schema}".vendas_vendedores`)).rows[0].total, 3);
    console.log('PASS: migracao preserva cadastros, identifica PF/PJ, mantem unicidade por empresa e persiste endereco.');
  } finally {
    await c.query('ROLLBACK');
    await c.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await c.end();
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
