require('dotenv/config');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

async function main() {
  await client.connect();

  const tables = await client.query(`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
    ORDER BY table_name
  `);

  const migrations = await client
    .query(`
      SELECT migration_name, finished_at
      FROM "_prisma_migrations"
      ORDER BY started_at
    `)
    .catch((error) => ({ rows: [{ error: error.message }] }));

  const migrationColumns = await client.query(`
    SELECT column_name, data_type
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = '_prisma_migrations'
    ORDER BY ordinal_position
  `);

  console.log(
    JSON.stringify(
      {
        tables: tables.rows.map((row) => row.table_name),
        migrationColumns: migrationColumns.rows,
        migrations: migrations.rows,
      },
      null,
      2,
    ),
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
