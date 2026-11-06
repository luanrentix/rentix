// Testa a migracao em schema isolado, sem alterar dados da aplicacao.
require('dotenv/config');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const { Client } = require('pg');

async function main() {
  const url = new URL(process.env.DATABASE_URL);
  assert(['localhost', '127.0.0.1', '[::1]'].includes(url.hostname));
  const schema = `short_codes_${randomUUID().replaceAll('-', '')}`;
  const client = new Client({ connectionString: url.toString() });
  await client.connect();
  try {
    await client.query(`CREATE SCHEMA "${schema}"`);
    await client.query(`CREATE TABLE "${schema}".empresas (id TEXT PRIMARY KEY, codigo_empresa TEXT UNIQUE NOT NULL, criado_em TIMESTAMP DEFAULT CURRENT_TIMESTAMP)`);
    await client.query(`INSERT INTO "${schema}".empresas (id, codigo_empresa) VALUES ('preservada', 'CTX-00001'), ('antiga', 'CTX-3F2DE957C7EB4150A79BBF988C12DF87')`);
    const sql = fs.readFileSync(path.resolve(__dirname, '../prisma/migrations/20261106170000_short_company_codes/migration.sql'), 'utf8')
      .replaceAll('public.', `"${schema}".`);
    await client.query(sql);
    assert.equal((await client.query(`SELECT codigo_empresa FROM "${schema}".empresas WHERE id='preservada'`)).rows[0].codigo_empresa, 'CTX-00001');
    assert.equal((await client.query(`SELECT codigo_empresa FROM "${schema}".empresas WHERE id='antiga'`)).rows[0].codigo_empresa, 'CTX-00002');
    await client.query(`INSERT INTO "${schema}".empresas (id) SELECT 'nova-' || n FROM generate_series(1, 1500) n`);
    const counts = (await client.query(`SELECT count(*)::int AS total, count(DISTINCT codigo_empresa)::int AS unicos, count(*) FILTER (WHERE codigo_empresa ~ '^CTX-[0-9A-Z]{5}$')::int AS curtos FROM "${schema}".empresas`)).rows[0];
    assert.deepEqual(counts, { total: 1502, unicos: 1502, curtos: 1502 });
    await client.query(`SELECT setval('"${schema}".empresas_codigo_curto_seq', 60466174)`);
    assert.equal((await client.query(`SELECT "${schema}".gerar_codigo_empresa() AS codigo`)).rows[0].codigo, 'CTX-ZZZZZ');
    await assert.rejects(client.query(`SELECT "${schema}".gerar_codigo_empresa()`), { code: '2200H' });
    console.log('PASS: conversao, preservacao de codigo curto, 1500 cadastros unicos, base 36 e limite sem repeticao.');
  } finally {
    await client.query('ROLLBACK');
    await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    await client.end();
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
