const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

const envSupabasePath = path.resolve(__dirname, '..', '.env.supabase');
if (fs.existsSync(envSupabasePath)) {
  dotenv.config({ path: envSupabasePath });
} else {
  dotenv.config({ path: path.resolve(__dirname, '..', '.env') });
}

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL ou DIRECT_URL não encontrados.');
  process.exit(1);
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

const isSupabase = databaseUrl.includes('supabase');
const pool = new Pool({
  connectionString: isSupabase ? removeSslMode(databaseUrl) : databaseUrl,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

async function main() {
  console.log('Conectando ao banco Supabase atual (Oregon)...');
  const client = await pool.connect();

  try {
    const tablesRes = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_type = 'BASE TABLE'
        AND table_name NOT LIKE 'backup_%'
        AND table_name NOT LIKE '_prisma_%'
      ORDER BY table_name;
    `);

    const tables = tablesRes.rows.map(r => r.table_name);
    console.log(`Tabelas encontradas (${tables.length}):`, tables.join(', '));

    const exportData = {
      exportedAt: new Date().toISOString(),
      sourceHost: isSupabase ? new URL(databaseUrl).hostname : 'local',
      tables: {},
      counts: {},
    };

    for (const table of tables) {
      const res = await client.query(`SELECT * FROM "${table}"`);
      exportData.tables[table] = res.rows;
      exportData.counts[table] = res.rows.length;
      console.log(` - ${table}: ${res.rows.length} registros`);
    }

    const backupDir = path.resolve(__dirname, '..', 'backups');
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }

    const outputFile = path.join(backupDir, 'supabase-oregon-export.json');
    fs.writeFileSync(outputFile, JSON.stringify(exportData, null, 2), 'utf-8');

    console.log(`\n✅ Backup completo salvo com sucesso em: ${outputFile}`);
    console.log('Resumo dos registros:', exportData.counts);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error('Erro ao exportar dados:', err);
  process.exit(1);
});
