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
    console.log('Limpando tabelas bancárias antigas...');
    await client.query(`DROP TABLE IF EXISTS "movimentacoes_bancarias" CASCADE;`);
    await client.query(`DROP TABLE IF EXISTS "contas_bancarias" CASCADE;`);
    await client.query(`DROP TYPE IF EXISTS "BankAccountType" CASCADE;`);
    await client.query(`DROP TYPE IF EXISTS "BankTransactionType" CASCADE;`);
    await client.query(`DROP TYPE IF EXISTS "BankTransactionStatus" CASCADE;`);

    console.log('Criando novos enums e tabelas bancárias no banco de dados...');
    
    await client.query(`
      CREATE TYPE "BankAccountType" AS ENUM ('CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH');
      CREATE TYPE "BankTransactionType" AS ENUM ('INFLOW', 'OUTFLOW');
      CREATE TYPE "BankTransactionStatus" AS ENUM ('PENDING', 'CONFIRMED');
    `);

    await client.query(`
      CREATE TABLE "contas_bancarias" (
          "id" TEXT NOT NULL,
          "empresa_id" TEXT NOT NULL,
          "nome" TEXT NOT NULL,
          "tipo" "BankAccountType" NOT NULL DEFAULT 'CHECKING',
          "agencia" TEXT,
          "numero_conta" TEXT,
          "codigo_banco" TEXT,
          "nome_banco" TEXT,
          "saldo_inicial" DECIMAL(10, 2) NOT NULL DEFAULT 0,
          "saldo_atual" DECIMAL(10, 2) NOT NULL DEFAULT 0,
          "limite" DECIMAL(10, 2) NOT NULL DEFAULT 0,
          "moeda" TEXT NOT NULL DEFAULT 'BRL',
          "ativo" BOOLEAN NOT NULL DEFAULT true,
          "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "contas_bancarias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
      );
    `);

    await client.query(`
      CREATE TABLE "movimentacoes_bancarias" (
          "id" TEXT NOT NULL,
          "conta_bancaria_id" TEXT NOT NULL,
          "tipo" "BankTransactionType" NOT NULL,
          "status" "BankTransactionStatus" NOT NULL DEFAULT 'PENDING',
          "valor" DECIMAL(10, 2) NOT NULL,
          "taxa" DECIMAL(10, 2) NOT NULL DEFAULT 0,
          "descricao" TEXT NOT NULL,
          "data_competencia" TIMESTAMP(3) NOT NULL,
          "data_pagamento" TIMESTAMP(3),
          "categoria" TEXT,
          "tipo_referencia" TEXT,
          "id_referencia" TEXT,
          "grupo_transferencia_id" TEXT,
          "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "atualizado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

          CONSTRAINT "movimentacoes_bancarias_pkey" PRIMARY KEY ("id"),
          CONSTRAINT "movimentacoes_bancarias_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "contas_bancarias" ("id") ON DELETE CASCADE ON UPDATE CASCADE
      );
    `);

    await client.query(`
      CREATE INDEX "contas_bancarias_empresa_id_idx" ON "contas_bancarias"("empresa_id");
    `);

    await client.query(`
      CREATE INDEX "movimentacoes_bancarias_conta_bancaria_id_idx" ON "movimentacoes_bancarias"("conta_bancaria_id");
    `);

    await client.query(`
      CREATE INDEX "movimentacoes_bancarias_data_competencia_idx" ON "movimentacoes_bancarias"("data_competencia");
    `);

    console.log('Novas tabelas e enums criados com sucesso!');
  } catch (error) {
    console.error('Erro ao criar tabelas:', error);
  } finally {
    client.release();
    await pool.end();
  }
}

main();
