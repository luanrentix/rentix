const fs = require('fs');
const path = require('path');
require('dotenv/config');
const { Client } = require('pg');

const databaseUrl = process.env.DATABASE_URL || process.env.DIRECT_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DIRECT_URL environment variable is required.');
}

const client = new Client({
  connectionString: databaseUrl,
});

const backupTargets = [
  ['companies', 'Company', 'empresas'],
  ['users', 'User', 'usuarios'],
  ['people', 'Person', 'pessoas'],
  ['properties', 'Property', 'imoveis'],
  ['contracts', 'Contract', 'contratos'],
];

async function tableExists(tableName) {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS "exists"
    `,
    [tableName],
  );

  return Boolean(result.rows[0]?.exists);
}

async function main() {
  await client.connect();

  const backup = {
    generatedAt: new Date().toISOString(),
    format: 'contrx-postgres-json-backup-v1',
    data: {},
    counts: {},
    tables: {},
  };

  for (const [key, legacyTableName, portugueseTableName] of backupTargets) {
    const tableName = (await tableExists(legacyTableName))
      ? legacyTableName
      : portugueseTableName;

    if (!(await tableExists(tableName))) {
      backup.data[key] = [];
      backup.counts[key] = 0;
      backup.tables[key] = null;
      continue;
    }

    const result = await client.query(`SELECT * FROM "${tableName}"`);
    const records = result.rows;

    backup.data[key] = records;
    backup.counts[key] = records.length;
    backup.tables[key] = tableName;
  }

  const backupDir = path.resolve(__dirname, '..', 'backups');
  fs.mkdirSync(backupDir, { recursive: true });

  const stamp = backup.generatedAt.replace(/[:.]/g, '-');
  const backupPath = path.join(backupDir, `contrx-backup-${stamp}.json`);

  fs.writeFileSync(backupPath, JSON.stringify(backup, null, 2));

  console.log(`Backup created: ${backupPath}`);
  console.log(JSON.stringify(backup.counts, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
