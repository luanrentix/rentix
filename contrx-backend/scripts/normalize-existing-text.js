require('dotenv/config');
const { Client } = require('pg');

const connectionString = process.env.DIRECT_URL || process.env.DATABASE_URL;

if (!connectionString) {
  console.error('DATABASE_URL ou DIRECT_URL nao configurada.');
  process.exit(1);
}

const client = new Client({ connectionString });

const uppercaseUpdates = [
  ['empresas', ['nome_fantasia', 'razao_social', 'documento', 'telefone']],
  ['usuarios', ['nome']],
  [
    'pessoas',
    ['nome', 'inscricao_estadual', 'rg', 'cidade', 'estado', 'endereco'],
  ],
  [
    'imoveis',
    [
      'titulo',
      'codigo',
      'tipo',
      'finalidade',
      'cidade',
      'estado',
      'endereco',
      'bairro',
      'numero',
      'complemento',
      'descricao',
    ],
  ],
  ['movimentacoes_imoveis', ['nome_imovel', 'tipo', 'descricao']],
  [
    'contratos',
    ['nome_imovel', 'nome_inquilino', 'motivo_status', 'motivo_finalizacao'],
  ],
  ['contas_receber', ['imovel', 'inquilino']],
  ['pagamentos_recebidos', ['observacao']],
  ['contas_pagar', ['pessoa', 'descricao', 'categoria', 'observacao']],
  ['pagamentos_realizados', ['observacao']],
  [
    'agenda_itens',
    [
      'titulo',
      'cliente',
      'imovel',
      'tipo',
      'responsavel',
      'lembrete',
      'observacoes',
    ],
  ],
];

const emailUpdates = [
  ['empresas', ['email']],
  ['usuarios', ['email']],
  ['pessoas', ['email']],
];

const settingsUserFields = ['name'];
const settingsCompanyFields = [
  'companyName',
  'tradeName',
  'document',
  'stateRegistration',
  'municipalRegistration',
  'zipCode',
  'address',
  'number',
  'neighborhood',
  'city',
  'state',
];

function quoted(identifier) {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function columnExists(table, column) {
  const result = await client.query(
    `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = $1
        AND column_name = $2
    `,
    [table, column],
  );

  return result.rowCount > 0;
}

async function updateTextColumns(tables, transform) {
  for (const [table, columns] of tables) {
    for (const column of columns) {
      if (!(await columnExists(table, column))) continue;

      await client.query(`
        UPDATE ${quoted(table)}
        SET ${quoted(column)} = ${transform}(${quoted(column)})
        WHERE ${quoted(column)} IS NOT NULL
          AND ${quoted(column)} <> ${transform}(${quoted(column)})
      `);
    }
  }
}

function uppercaseJsonFields(value, fields) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return value;
  }

  const nextValue = { ...value };

  fields.forEach((field) => {
    if (typeof nextValue[field] === 'string') {
      nextValue[field] = nextValue[field].trim().toLocaleUpperCase('pt-BR');
    }
  });

  return nextValue;
}

async function updateSettingsJson() {
  const hasSettingsTable = await client.query(
    `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'configuracoes_app'
    `,
  );

  if (hasSettingsTable.rowCount === 0) return;

  const settings = await client.query(`
    SELECT id, configuracoes_usuario, configuracoes_empresa
    FROM configuracoes_app
  `);

  for (const row of settings.rows) {
    await client.query(
      `
        UPDATE configuracoes_app
        SET configuracoes_usuario = $2,
            configuracoes_empresa = $3
        WHERE id = $1
      `,
      [
        row.id,
        uppercaseJsonFields(row.configuracoes_usuario, settingsUserFields),
        uppercaseJsonFields(row.configuracoes_empresa, settingsCompanyFields),
      ],
    );
  }
}

async function main() {
  await client.connect();

  await updateTextColumns(uppercaseUpdates, 'upper');
  await updateTextColumns(emailUpdates, 'lower');
  await updateSettingsJson();

  console.log('Normalizacao de textos existentes concluida.');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await client.end().catch(() => undefined);
  });
