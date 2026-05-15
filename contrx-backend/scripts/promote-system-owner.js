require('dotenv').config();

const { Client } = require('pg');

async function main() {
  const email = process.argv[2]?.trim().toLowerCase();

  if (!email) {
    throw new Error('Informe o e-mail: node scripts/promote-system-owner.js email@exemplo.com');
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  await client.connect();

  const result = await client.query(
    `
      update usuarios
      set papel = 'DONO_SISTEMA'
      where lower(email) = $1
      returning id, nome, email, papel
    `,
    [email],
  );

  await client.end();

  if (result.rowCount === 0) {
    throw new Error(`Nenhum usuario encontrado com o e-mail ${email}.`);
  }

  console.log(JSON.stringify(result.rows[0], null, 2));
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
