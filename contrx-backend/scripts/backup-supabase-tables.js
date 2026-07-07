require('dotenv/config');
const { Pool } = require('pg');

const databaseUrl = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL or DIRECT_URL environment variable is required.');
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

const rejectUnauthorized = process.env.CONTRX_DB_SSL_REJECT_UNAUTHORIZED !== 'false';
const pool = new Pool({
  connectionString: databaseUrl.includes('supabase') ? removeSslMode(databaseUrl) : databaseUrl,
  ssl: databaseUrl.includes('supabase') ? { rejectUnauthorized } : undefined,
});

const tablesToBackup = [
  'usuarios',
  'empresas',
  'configuracoes_app',
  'pessoas',
  'imoveis',
  'contratos',
  'contas_receber',
  'contas_pagar',
  'pagamentos_recebidos',
  'pagamentos_realizados',
  'agenda_itens',
  'movimentacoes_imoveis',
  'assinaturas_contrato',
  'contas_bancarias',
  'movimentacoes_bancarias',
];

const backupSuffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

async function tableExists(client, tableName) {
  const result = await client.query(
    `
      SELECT EXISTS (
        SELECT 1
        FROM information_schema.tables
        WHERE table_schema = 'public'
          AND table_name = $1
      ) AS "exists"
    `,
    [tableName]
  );
  return Boolean(result.rows[0]?.exists);
}

async function getBackupTablesFor(client, tableName) {
  const result = await client.query(
    `
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name LIKE $1
    `,
    [`backup_${tableName}_%`]
  );
  return result.rows.map(r => r.table_name);
}

async function main() {
  const client = await pool.connect();
  console.log('Iniciando backup de tabelas de seguranca no Supabase...');
  
  try {
    for (const tableName of tablesToBackup) {
      if (await tableExists(client, tableName)) {
        // Encontra e remove backups antigos desta tabela específica para não acumular lixo
        const oldBackups = await getBackupTablesFor(client, tableName);
        for (const oldBackupTable of oldBackups) {
          console.log(`Removendo backup antigo: ${oldBackupTable}`);
          await client.query(`DROP TABLE IF EXISTS "${oldBackupTable}" CASCADE`);
        }
        
        // Cria o novo backup contendo todos os dados atuais
        const newBackupTable = `backup_${tableName}_${backupSuffix}`;
        console.log(`Criando backup: ${tableName} -> ${newBackupTable}`);
        await client.query(`CREATE TABLE "${newBackupTable}" AS TABLE "${tableName}"`);
      } else {
        console.log(`Tabela ${tableName} nao existe no banco (sera criada pela migracao). Pulando backup.`);
      }
    }
    console.log('Backup de tabelas concluido com sucesso!');
  } catch (error) {
    console.error('Erro ao realizar o backup das tabelas:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
