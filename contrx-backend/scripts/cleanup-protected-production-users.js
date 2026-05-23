require('dotenv/config');

const { Pool } = require('pg');

const protectedEmails = ['luanathmra@gmail.com', 'adm@contrx.com'];
const backupSuffix = new Date().toISOString().replace(/[-:.TZ]/g, '').slice(0, 14);

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
];

function getDatabaseUrl() {
  return process.env.DIRECT_URL || process.env.DATABASE_URL;
}

function shouldRunCleanup() {
  return process.env.CONTRX_CLEAN_PRODUCTION_KEEP_PROTECTED_USERS === 'true';
}

async function main() {
  if (!shouldRunCleanup()) {
    console.log(
      'Protected production cleanup skipped. Set CONTRX_CLEAN_PRODUCTION_KEEP_PROTECTED_USERS=true to run it.',
    );
    return;
  }

  const databaseUrl = getDatabaseUrl();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL or DIRECT_URL environment variable is required.');
  }

  const pool = new Pool({ connectionString: databaseUrl });
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const protectedUsersResult = await client.query(
      `
        SELECT id, empresa_id, email
        FROM usuarios
        WHERE lower(email) = ANY($1::text[])
      `,
      [protectedEmails.map((email) => email.toLowerCase())],
    );

    const foundEmails = protectedUsersResult.rows.map((user) =>
      String(user.email).toLowerCase(),
    );
    const missingEmails = protectedEmails.filter(
      (email) => !foundEmails.includes(email.toLowerCase()),
    );

    if (missingEmails.length > 0) {
      throw new Error(
        `Cleanup canceled. Missing protected users: ${missingEmails.join(', ')}`,
      );
    }

    const protectedUserIds = protectedUsersResult.rows.map((user) => user.id);
    const protectedCompanyIds = [
      ...new Set(protectedUsersResult.rows.map((user) => user.empresa_id)),
    ];

    for (const tableName of tablesToBackup) {
      await client.query(
        `CREATE TABLE IF NOT EXISTS backup_${tableName}_${backupSuffix} AS TABLE ${tableName}`,
      );
    }

    const beforeResult = await getDatabaseCounts(client);

    await client.query(
      `
        DELETE FROM pagamentos_recebidos
        WHERE conta_receber_id IN (
          SELECT id FROM contas_receber WHERE NOT (empresa_id = ANY($1::uuid[]))
        )
      `,
      [protectedCompanyIds],
    );

    await client.query(
      `
        DELETE FROM pagamentos_realizados
        WHERE conta_pagar_id IN (
          SELECT id FROM contas_pagar WHERE NOT (empresa_id = ANY($1::uuid[]))
        )
      `,
      [protectedCompanyIds],
    );

    await client.query(
      'DELETE FROM agenda_itens WHERE NOT (empresa_id = ANY($1::uuid[]))',
      [protectedCompanyIds],
    );
    await client.query(
      'DELETE FROM movimentacoes_imoveis WHERE NOT (empresa_id = ANY($1::uuid[]))',
      [protectedCompanyIds],
    );
    await client.query(
      'DELETE FROM contas_receber WHERE NOT (empresa_id = ANY($1::uuid[]))',
      [protectedCompanyIds],
    );
    await client.query(
      'DELETE FROM contas_pagar WHERE NOT (empresa_id = ANY($1::uuid[]))',
      [protectedCompanyIds],
    );
    await client.query(
      'DELETE FROM contratos WHERE NOT (empresa_id = ANY($1::uuid[]))',
      [protectedCompanyIds],
    );
    await client.query(
      'DELETE FROM imoveis WHERE NOT (empresa_id = ANY($1::uuid[]))',
      [protectedCompanyIds],
    );
    await client.query(
      'DELETE FROM pessoas WHERE NOT (empresa_id = ANY($1::uuid[]))',
      [protectedCompanyIds],
    );
    await client.query(
      'DELETE FROM configuracoes_app WHERE NOT (empresa_id = ANY($1::uuid[]))',
      [protectedCompanyIds],
    );
    await client.query('DELETE FROM usuarios WHERE NOT (id = ANY($1::uuid[]))', [
      protectedUserIds,
    ]);
    await client.query('DELETE FROM empresas WHERE NOT (id = ANY($1::uuid[]))', [
      protectedCompanyIds,
    ]);

    const afterResult = await getDatabaseCounts(client);

    await client.query('COMMIT');

    console.log(
      JSON.stringify(
        {
          protectedEmails,
          protectedUserIds,
          protectedCompanyIds,
          backupSuffix,
          before: beforeResult,
          after: afterResult,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

async function getDatabaseCounts(client) {
  const result = await client.query(`
    SELECT
      (SELECT count(*)::int FROM usuarios) AS usuarios,
      (SELECT count(*)::int FROM empresas) AS empresas,
      (SELECT count(*)::int FROM configuracoes_app) AS configuracoes_app,
      (SELECT count(*)::int FROM pessoas) AS pessoas,
      (SELECT count(*)::int FROM imoveis) AS imoveis,
      (SELECT count(*)::int FROM contratos) AS contratos,
      (SELECT count(*)::int FROM contas_receber) AS contas_receber,
      (SELECT count(*)::int FROM contas_pagar) AS contas_pagar,
      (SELECT count(*)::int FROM pagamentos_recebidos) AS pagamentos_recebidos,
      (SELECT count(*)::int FROM pagamentos_realizados) AS pagamentos_realizados,
      (SELECT count(*)::int FROM agenda_itens) AS agenda_itens,
      (SELECT count(*)::int FROM movimentacoes_imoveis) AS movimentacoes_imoveis
  `);

  return result.rows[0];
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
