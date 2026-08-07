import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

async function main() {
  const dbUrl =
    'postgresql://postgres.fzmqrrxnxczeyxxrzjrv:ContrxERP2026Lh@aws-1-us-west-2.pooler.supabase.com:5432/postgres';
  const pool = new Pool({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });

  try {
    console.log('Creating table error in database...');
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "error" (
        "id" TEXT NOT NULL,
        "empresa_id" TEXT,
        "nivel" TEXT NOT NULL DEFAULT 'ERROR',
        "mensagem" TEXT NOT NULL,
        "stack_trace" TEXT,
        "rota" TEXT,
        "metodo" TEXT,
        "status_code" INTEGER,
        "email_usuario" TEXT,
        "payload_requisicao" TEXT,
        "user_agent" TEXT,
        "ip" TEXT,
        "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

        CONSTRAINT "error_pkey" PRIMARY KEY ("id")
      );
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "error_empresa_id_idx" ON "error"("empresa_id");
    `);
    await prisma.$executeRawUnsafe(`
      CREATE INDEX IF NOT EXISTS "error_criado_em_idx" ON "error"("criado_em");
    `);
    console.log('Table error and indexes created successfully in database!');
  } catch (err) {
    console.error('Error creating table error:', err);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

main();
