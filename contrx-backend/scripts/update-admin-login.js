require('dotenv/config');

const bcrypt = require('bcrypt');
const crypto = require('crypto');
const { Client } = require('pg');

const ADMIN_EMAILS = [
  'admin@rentix.com',
  'admin@contrx.com',
  'adm@contrx.com',
  'admin@contrx.com.br',
  'adm@contrx.com.br',
];
const ADMIN_EMAIL = 'adm@contrx.com.br';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '123456';
const ADMIN_NAME = 'Administrador Contrx';
const COMPANY_NAME = 'Contrx';

function isDatabaseAuthError(error) {
  const message = String(error?.message || '').toLowerCase();

  return (
    error?.code === '28P01' ||
    error?.code === 'P1000' ||
    message.includes('password authentication failed') ||
    message.includes('authentication failed')
  );
}

async function main() {
  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });

  await client.connect();

  const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 10);

  const result = await client.query(
    `
      update usuarios
      set email = $1,
          senha_hash = $2,
          nome = coalesce(nullif(nome, ''), $4),
          papel = 'DONO_SISTEMA',
          ativo = true,
          atualizado_em = now()
      where lower(email) = any($3::text[])
      returning id, nome, email, papel, ativo
    `,
    [ADMIN_EMAIL, passwordHash, ADMIN_EMAILS, ADMIN_NAME],
  );

  if (result.rowCount > 0) {
    console.log(JSON.stringify(result.rows[0], null, 2));
    await client.end();
    return;
  }

  const companyId = crypto.randomUUID();
  const userId = crypto.randomUUID();
  const settingsId = crypto.randomUUID();

  await client.query('BEGIN');

  try {
    await client.query(
      `
        insert into empresas (
          id,
          nome_fantasia,
          razao_social,
          email,
          ativo,
          criado_em,
          atualizado_em
        )
        values ($1, $2, $2, $3, true, now(), now())
      `,
      [companyId, COMPANY_NAME, ADMIN_EMAIL],
    );

    const createdUser = await client.query(
      `
        insert into usuarios (
          id,
          empresa_id,
          nome,
          email,
          senha_hash,
          papel,
          ativo,
          criado_em,
          atualizado_em
        )
        values ($1, $2, $3, $4, $5, 'DONO_SISTEMA', true, now(), now())
        returning id, nome, email, papel, ativo
      `,
      [userId, companyId, ADMIN_NAME, ADMIN_EMAIL, passwordHash],
    );

    await client.query(
      `
        insert into configuracoes_app (
          id,
          empresa_id,
          configuracoes_usuario,
          configuracoes_empresa,
          configuracoes_tema,
          criado_em,
          atualizado_em
        )
        values ($1, $2, $3::jsonb, $4::jsonb, $5::jsonb, now(), now())
      `,
      [
        settingsId,
        companyId,
        JSON.stringify({ name: ADMIN_NAME, email: ADMIN_EMAIL }),
        JSON.stringify({
          companyName: COMPANY_NAME,
          tradeName: COMPANY_NAME,
          email: ADMIN_EMAIL,
        }),
        JSON.stringify({ mode: 'light' }),
      ],
    );

    await client.query('COMMIT');
    console.log(JSON.stringify(createdUser.rows[0], null, 2));
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  if (isDatabaseAuthError(error)) {
    console.error(
      'Credenciais do banco invalidas. Atualize DATABASE_URL/DIRECT_URL em contrx-backend/.env e execute o script novamente.',
    );
    process.exit(1);
  }

  console.error(error.message || error);
  process.exit(1);
});
