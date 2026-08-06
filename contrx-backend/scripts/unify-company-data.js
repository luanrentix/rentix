require('dotenv/config');
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });

  await client.connect();
  const targetCompanyId = 'bab9160e-f3d2-4e10-9fd6-9fa2c64af4e9';

  await client.query('UPDATE usuarios SET empresa_id = $1', [targetCompanyId]);
  await client.query('UPDATE imoveis SET empresa_id = $1', [targetCompanyId]);
  await client.query('UPDATE contratos SET empresa_id = $1', [targetCompanyId]);
  await client.query('UPDATE pessoas SET empresa_id = $1', [targetCompanyId]);

  const p = await client.query('SELECT count(*) FROM imoveis WHERE empresa_id = $1', [targetCompanyId]);
  const c = await client.query('SELECT count(*) FROM contratos WHERE empresa_id = $1', [targetCompanyId]);
  const pe = await client.query('SELECT count(*) FROM pessoas WHERE empresa_id = $1', [targetCompanyId]);

  console.log('REGISTROS UNIFICADOS COM SUCESSO!');
  console.log(JSON.stringify({
    empresa_id: targetCompanyId,
    imoveis: parseInt(p.rows[0].count, 10),
    contratos: parseInt(c.rows[0].count, 10),
    pessoas: parseInt(pe.rows[0].count, 10),
  }, null, 2));

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
