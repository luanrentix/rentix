const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');
const { Pool } = require('pg');

// Aceita URL de banco passada como argumento ou do .env.supabase
const targetDbUrl = process.argv[2] || process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!targetDbUrl) {
  console.error('Uso: node scripts/import-json-to-supabase.js "<NOVA_DATABASE_URL_SP>"');
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

const isSupabase = targetDbUrl.includes('supabase');
const pool = new Pool({
  connectionString: isSupabase ? removeSslMode(targetDbUrl) : targetDbUrl,
  ssl: isSupabase ? { rejectUnauthorized: false } : undefined,
});

// Ordem de inserção para respeitar integridade referencial e chaves estrangeiras
const tableOrder = [
  'empresas',
  'usuarios',
  'configuracoes_app',
  'pessoas',
  'imoveis',
  'contratos',
  'contas_bancarias',
  'contas_receber',
  'contas_pagar',
  'pagamentos_recebidos',
  'pagamentos_realizados',
  'movimentacoes_bancarias',
  'agenda_itens',
  'movimentacoes_imoveis',
  'assinaturas_contrato',
  'chamados_suporte',
  'historico_comercial',
  'arquivos_sistema',
  'impressos_compartilhados',
  'error',
];

async function main() {
  const backupFile = path.resolve(__dirname, '..', 'backups', 'supabase-oregon-export.json');
  if (!fs.existsSync(backupFile)) {
    console.error(`Arquivo de backup não encontrado em: ${backupFile}`);
    process.exit(1);
  }

  const backupData = JSON.parse(fs.readFileSync(backupFile, 'utf-8'));
  console.log(`Carregando backup gerado em ${backupData.exportedAt}...`);

  const client = await pool.connect();

  try {
    console.log('Iniciando importação de dados para o novo banco em São Paulo...');
    await client.query('BEGIN');

    // Desabilitar triggers de foreign key temporariamente durante a restauração
    await client.query("SET session_replication_role = 'replica';");

    for (const table of tableOrder) {
      const rows = backupData.tables[table] || [];
      if (rows.length === 0) continue;

      console.log(`Restaurando ${table} (${rows.length} registros)...`);

      for (const row of rows) {
        const columns = Object.keys(row);
        const values = Object.values(row);
        const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');
        const colNames = columns.map(c => `"${c}"`).join(', ');

        const updateSet = columns
          .map(c => `"${c}" = EXCLUDED."${c}"`)
          .join(', ');

        const query = `
          INSERT INTO "${table}" (${colNames})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE SET ${updateSet};
        `;

        await client.query(query, values);
      }
    }

    // Restaurar triggers
    await client.query("SET session_replication_role = 'origin';");
    await client.query('COMMIT');

    console.log('\n🎉 SUCESSO! Todos os dados foram restaurados no novo banco Supabase (São Paulo)!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('\n❌ Erro durante a importação:', err);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
