require('dotenv/config');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  const schema = `code_id_${randomUUID().replaceAll('-', '')}`;
  const c = new Client({ connectionString: url.toString() });
  await c.connect();
  try {
    await c.query(`CREATE SCHEMA "${schema}"`);
    await c.query(`CREATE TABLE "${schema}".empresas (id TEXT PRIMARY KEY, codigo_empresa TEXT UNIQUE NOT NULL)`);
    await c.query(`CREATE SEQUENCE "${schema}".empresas_codigo_curto_seq`);
    await c.query(`CREATE FUNCTION "${schema}".gerar_codigo_empresa() RETURNS TEXT LANGUAGE sql AS $$ SELECT 'CTX-00001'::text $$`);
    await c.query(`INSERT INTO "${schema}".empresas VALUES ('bab91-empresa-antiga', 'CTX-00001')`);
    const sql = fs.readFileSync(path.resolve(__dirname, '../prisma/migrations/20261106180000_company_code_from_id/migration.sql'), 'utf8').replaceAll('public.', `"${schema}".`);
    await c.query(sql);
    assert.equal((await c.query(`SELECT codigo_empresa FROM "${schema}".empresas`)).rows[0].codigo_empresa, 'CTX-BAB91');
    await c.query(`INSERT INTO "${schema}".empresas (id) VALUES ('a1b2c-empresa-nova')`);
    assert.equal((await c.query(`SELECT codigo_empresa FROM "${schema}".empresas WHERE id='a1b2c-empresa-nova'`)).rows[0].codigo_empresa, 'CTX-A1B2C');
    await assert.rejects(c.query(`INSERT INTO "${schema}".empresas (id) VALUES ('a1b2c-outra-empresa')`), { code: '23505' });
    assert.equal((await c.query(`SELECT count(*)::int AS total FROM "${schema}".empresas`)).rows[0].total, 2);
    console.log('PASS: conversao pelo ID, geracao automatica e rejeicao de colisao sem alterar IDs.');
  } finally {
    await c.query('ROLLBACK');
    await c.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await c.end();
  }
}
main().catch(e => { console.error(e.message); process.exitCode = 1; });
