require('dotenv/config');
const bcrypt = require('bcrypt');
const { Client } = require('pg');

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });

  await client.connect();
  const hash = await bcrypt.hash('123', 10);

  const res = await client.query(
    `UPDATE usuarios SET senha_hash = $1, ativo = true WHERE lower(email) = $2 OR lower(email) = $3`,
    [hash, 'adm@contrx.com', 'adm@contrx.com.br']
  );

  console.log('SENHA ATUALIZADA COM SUCESSO PARA 123!', res.rowCount, 'linhas alteradas.');
  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
