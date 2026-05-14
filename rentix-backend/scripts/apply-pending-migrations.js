require('dotenv/config');
const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const client = new Client({
  connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
});

const migrationsDir = path.resolve(__dirname, '..', 'prisma', 'migrations');

function getMigrationNames() {
  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => {
      if (!entry.isDirectory()) {
        return false;
      }

      return fs.existsSync(path.join(migrationsDir, entry.name, 'migration.sql'));
    })
    .map((entry) => entry.name)
    .sort();
}

async function migrationAlreadyApplied(migrationName) {
  const result = await client.query(
    `
      SELECT 1
      FROM "_prisma_migrations"
      WHERE migration_name = $1
        AND rolled_back_at IS NULL
      LIMIT 1
    `,
    [migrationName],
  );

  return result.rowCount > 0;
}

async function applyMigration(migrationName) {
  if (await migrationAlreadyApplied(migrationName)) {
    console.log(`Skipping already applied migration: ${migrationName}`);
    return;
  }

  const migrationPath = path.join(migrationsDir, migrationName, 'migration.sql');
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const checksum = crypto.createHash('sha256').update(sql).digest('hex');
  const id = crypto.randomUUID();

  console.log(`Applying migration: ${migrationName}`);

  await client.query('BEGIN');

  try {
    const startedAt = new Date();

    await client.query(sql);

    await client.query(
      `
        INSERT INTO "_prisma_migrations" (
          id,
          checksum,
          finished_at,
          migration_name,
          logs,
          rolled_back_at,
          started_at,
          applied_steps_count
        )
        VALUES ($1, $2, NOW(), $3, NULL, NULL, $4, 1)
      `,
      [id, checksum, migrationName, startedAt],
    );

    await client.query('COMMIT');
    console.log(`Applied migration: ${migrationName}`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

async function main() {
  if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
    throw new Error('DATABASE_URL or DIRECT_URL environment variable is required.');
  }

  await client.connect();

  for (const migrationName of getMigrationNames()) {
    await applyMigration(migrationName);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
