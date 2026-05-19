require('dotenv/config');

const { Client } = require('pg');

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

function isSupabaseDatabaseUrl(url) {
  try {
    return new URL(url).hostname.includes('supabase.');
  } catch {
    return url?.includes('supabase.');
  }
}

function removeSslMode(url) {
  try {
    const parsedUrl = new URL(url);

    parsedUrl.searchParams.delete('sslmode');

    return parsedUrl.toString();
  } catch {
    return url.replace(/[?&]sslmode=require\b/, '');
  }
}

function createClient() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL or DIRECT_URL environment variable is required.');
  }

  const isSupabaseConnection = isSupabaseDatabaseUrl(databaseUrl);

  return new Client({
    connectionString: isSupabaseConnection
      ? removeSslMode(databaseUrl)
      : databaseUrl,
    ssl: isSupabaseConnection ? { rejectUnauthorized: false } : undefined,
  });
}

async function ensureSchema(client) {
  await client.query(`
    ALTER TYPE "papel_usuario" ADD VALUE IF NOT EXISTS 'DONO_SISTEMA'
  `);

  await client.query(`
    ALTER TABLE IF EXISTS "usuarios"
    ADD COLUMN IF NOT EXISTS "permissoes" JSONB
  `);

  await client.query(`
    ALTER TABLE IF EXISTS "usuarios"
    ADD COLUMN IF NOT EXISTS "sessao_ativa_id" TEXT
  `);

  await client.query(`
    ALTER TABLE IF EXISTS "pessoas"
    ADD COLUMN IF NOT EXISTS "inquilino" BOOLEAN NOT NULL DEFAULT true
  `);
}

async function main() {
  const client = createClient();

  await client.connect();

  try {
    await ensureSchema(client);
    console.log('Database schema guard completed.');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
