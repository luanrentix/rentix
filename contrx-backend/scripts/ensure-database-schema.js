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

function shouldRejectUnauthorizedTls() {
  return process.env.CONTRX_DB_SSL_REJECT_UNAUTHORIZED !== 'false';
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
    ssl: isSupabaseConnection
      ? { rejectUnauthorized: shouldRejectUnauthorizedTls() }
      : undefined,
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
    ALTER TABLE IF EXISTS "usuarios"
    ADD COLUMN IF NOT EXISTS "ultimo_login_em" TIMESTAMPTZ
  `);

  await client.query(`
    UPDATE "usuarios"
    SET "ultimo_login_em" = "criado_em"
    WHERE "ultimo_login_em" IS NULL
  `);

  await client.query(`
    ALTER TABLE IF EXISTS "pessoas"
    ADD COLUMN IF NOT EXISTS "inquilino" BOOLEAN NOT NULL DEFAULT true
  `);

  await client.query(`
    ALTER TABLE IF EXISTS "pessoas"
    ADD COLUMN IF NOT EXISTS "foto" TEXT
  `);

  await client.query(`
    ALTER TABLE IF EXISTS "imoveis"
    ADD COLUMN IF NOT EXISTS "fotos" TEXT
  `);

  await client.query(`
    ALTER TABLE IF EXISTS "contas_pagar"
    ADD COLUMN IF NOT EXISTS "imovel_id" TEXT
  `);

  await client.query(`
    ALTER TABLE IF EXISTS "agenda_itens"
    ADD COLUMN IF NOT EXISTS "pessoa_id" TEXT
  `);

  await client.query(`
    ALTER TABLE IF EXISTS "agenda_itens"
    ADD COLUMN IF NOT EXISTS "imovel_id" TEXT
  `);

  await client.query(`
    DO $$
    BEGIN
      IF to_regclass('public.contas_pagar') IS NOT NULL THEN
        CREATE INDEX IF NOT EXISTS "contas_pagar_imovel_id_idx"
        ON "contas_pagar"("imovel_id");
      END IF;
    END
    $$;
  `);

  await client.query(`
    DO $$
    BEGIN
      IF to_regclass('public.contas_pagar') IS NOT NULL
        AND to_regclass('public.imoveis') IS NOT NULL
        AND NOT EXISTS (
          SELECT 1
          FROM pg_constraint
          WHERE conname = 'contas_pagar_imovel_id_fkey'
        )
      THEN
        ALTER TABLE "contas_pagar"
        ADD CONSTRAINT "contas_pagar_imovel_id_fkey"
        FOREIGN KEY ("imovel_id") REFERENCES "imoveis"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
      END IF;
    END
    $$;
  `);

  await client.query(`
    DO $$
    BEGIN
      IF to_regclass('public.extratos_compartilhados') IS NOT NULL AND to_regclass('public.impressos_compartilhados') IS NULL THEN
        ALTER TABLE "extratos_compartilhados" RENAME TO "impressos_compartilhados";
      END IF;
      IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'extratos_compartilhados_pkey') THEN
        ALTER TABLE "impressos_compartilhados" RENAME CONSTRAINT "extratos_compartilhados_pkey" TO "impressos_compartilhados_pkey";
      END IF;
    END
    $$;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "impressos_compartilhados" (
      "id" TEXT NOT NULL,
      "empresa_id" TEXT NOT NULL,
      "conta_bancaria_id" TEXT,
      "tipo_documento" TEXT DEFAULT 'EXTRATO_BANCARIO',
      "cliente_id" TEXT,
      "data_inicio" TEXT,
      "data_fim" TEXT,
      "tipo" TEXT,
      "filtro_vencimento" TEXT,
      "status" TEXT,
      "categoria" TEXT,
      "descricao" TEXT,
      "expira_em" TIMESTAMP(3) NOT NULL,
      "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "impressos_compartilhados_pkey" PRIMARY KEY ("id")
    );
  `);

  await client.query(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='impressos_compartilhados' AND column_name='tipo_documento') THEN
        ALTER TABLE "impressos_compartilhados" ADD COLUMN "tipo_documento" TEXT DEFAULT 'EXTRATO_BANCARIO';
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='impressos_compartilhados' AND column_name='cliente_id') THEN
        ALTER TABLE "impressos_compartilhados" ADD COLUMN "cliente_id" TEXT;
      END IF;
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='impressos_compartilhados' AND column_name='filtro_vencimento') THEN
        ALTER TABLE "impressos_compartilhados" ADD COLUMN "filtro_vencimento" TEXT;
      END IF;
    END
    $$;
  `);

  await client.query(`
    CREATE TABLE IF NOT EXISTS "chamados_suporte" (
      "id" TEXT NOT NULL,
      "usuario_id" TEXT NOT NULL,
      "empresa_id" TEXT NOT NULL,
      "assunto" TEXT NOT NULL,
      "mensagem" TEXT NOT NULL,
      "resposta" TEXT,
      "status" TEXT NOT NULL DEFAULT 'ABERTO',
      "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

      CONSTRAINT "chamados_suporte_pkey" PRIMARY KEY ("id")
    );
  `);

  await client.query(`
    DO $$
    DECLARE
      t text;
    BEGIN
      FOR t IN
        SELECT table_name
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_type = 'BASE TABLE'
          AND table_name NOT LIKE '_prisma%'
      LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
      END LOOP;
    END
    $$;
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
