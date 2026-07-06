const { Pool } = require('pg');
require('dotenv').config();

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('Erro: DATABASE_URL não está definida no ambiente.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
});

async function main() {
  const client = await pool.connect();
  try {
    console.log('Criando enums e tabela no banco de dados...');
    
    await client.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'ContractSignatureStatus') THEN
          CREATE TYPE "ContractSignatureStatus" AS ENUM ('PENDING', 'SIGNED');
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SignerRole') THEN
          CREATE TYPE "SignerRole" AS ENUM ('LANDLORD', 'TENANT', 'GUARANTOR', 'WITNESS');
        END IF;
      END
      $$;
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS "assinaturas_contrato" (
          "id" TEXT NOT NULL,
          "contrato_id" TEXT NOT NULL,
          "nome" TEXT NOT NULL,
          "email" TEXT NOT NULL,
          "papel" "SignerRole" NOT NULL DEFAULT 'TENANT',
          "status" "ContractSignatureStatus" NOT NULL DEFAULT 'PENDING',
          "token_acesso" TEXT NOT NULL,
          "assinado_em" TIMESTAMP(3),
          "endereco_ip" TEXT,
          "agente_usuario" TEXT,
          "hash_documento" TEXT,

          CONSTRAINT "assinaturas_contrato_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "assinaturas_contrato_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await client.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS "assinaturas_contrato_token_acesso_key" ON "assinaturas_contrato"("token_acesso");
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS "assinaturas_contrato_contrato_id_idx" ON "assinaturas_contrato"("contrato_id");
    `);

    console.log('Tabela assinaturas_contrato criada com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabela:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
