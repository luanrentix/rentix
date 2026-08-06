require('dotenv/config');
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const fileArg = process.argv[2] || 'backups/contrx-backup-2026-07-12T15-16-40-595Z.json';
const backupFile = path.resolve(__dirname, '..', fileArg);

const tableMap = {
  companies: 'empresas',
  users: 'usuarios',
  people: 'pessoas',
  properties: 'imoveis',
  contracts: 'contratos',
};

const fieldMap = {
  tradeName: 'nome_fantasia',
  companyName: 'razao_social',
  document: 'documento',
  phone: 'telefone',
  email: 'email',
  isActive: 'ativo',
  createdAt: 'criado_em',
  updatedAt: 'atualizado_em',
  companyId: 'empresa_id',
  passwordHash: 'senha_hash',
  name: 'nome',
  role: 'papel',
  type: 'tipo',
  status: 'status',
  stateRegistration: 'inscricao_estadual',
  identityNumber: 'rg',
  zipCode: 'cep',
  city: 'cidade',
  state: 'estado',
  address: 'endereco',
  ownerId: 'proprietario_id',
  title: 'titulo',
  code: 'codigo',
  purpose: 'finalidade',
  rentalValue: 'valor_aluguel',
  district: 'bairro',
  number: 'numero',
  complement: 'complemento',
  bedrooms: 'quartos',
  bathrooms: 'banheiros',
  garages: 'garagens',
  description: 'descricao',
  propertyId: 'imovel_id',
  tenantId: 'inquilino_id',
  propertyName: 'nome_imovel',
  tenantName: 'nome_inquilino',
  startDate: 'data_inicio',
  endDate: 'data_fim',
  rentValue: 'valor_aluguel',
};

async function main() {
  const content = JSON.parse(fs.readFileSync(backupFile, 'utf8'));
  const data = content.data || content;

  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });

  await client.connect();
  await client.query('BEGIN');

  try {
    const keys = ['companies', 'users', 'people', 'properties', 'contracts'];
    const summary = {};

    for (const key of keys) {
      const items = data[key] || [];
      const tableName = tableMap[key] || key;
      let insertedCount = 0;

      for (const rawItem of items) {
        const item = {};
        for (const [k, v] of Object.entries(rawItem)) {
          const colName = fieldMap[k] || k;
          if (v !== undefined) {
            if (v !== null && typeof v === 'object') {
              item[colName] = JSON.stringify(v);
            } else {
              item[colName] = v;
            }
          }
        }

        if (!item.id) continue;

        const cols = Object.keys(item);
        const placeholders = cols.map((_, i) => `$${i + 1}`).join(', ');
        const values = Object.values(item);
        const updateSets = cols
          .filter((c) => c !== 'id')
          .map((c) => `${c} = excluded.${c}`)
          .join(', ');

        const sql = `
          INSERT INTO ${tableName} (${cols.join(', ')})
          VALUES (${placeholders})
          ON CONFLICT (id) DO UPDATE
          SET ${updateSets}
        `;

        await client.query(sql, values);
        insertedCount++;
      }

      summary[tableName] = insertedCount;
    }

    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash('123456', 10);
    await client.query(
      `UPDATE usuarios SET senha_hash = $1, ativo = true WHERE lower(email) in ('adm@contrx.com.br', 'admin@contrx.com', 'admin@rentix.com')`,
      [hash]
    );

    await client.query('COMMIT');
    console.log('RESTAURAÇÃO CONCLUÍDA COM SUCESSO!');
    console.log(JSON.stringify(summary, null, 2));
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Erro na restauração:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
