require('dotenv/config');

const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

const backupPath =
  process.argv[2] ||
  path.resolve(
    __dirname,
    '..',
    'backups',
    'rentix-backup-2026-05-13T23-51-43-586Z.json',
  );

const roleMap = {
  OWNER: 'PROPRIETARIO',
  ADMIN: 'ADMINISTRADOR',
  MANAGER: 'GERENTE',
  USER: 'USER',
  SYSTEM_OWNER: 'DONO_SISTEMA',
};

const ADMIN_EMAILS = new Set(['adm@contrx.com.br', 'adm@contrx.com']);

const personTypeMap = {
  INDIVIDUAL: 'PESSOA_FISICA',
  COMPANY: 'PESSOA_JURIDICA',
};

const personStatusMap = {
  ACTIVE: 'ATIVO',
  INACTIVE: 'INATIVO',
};

function required(value, label) {
  if (value === undefined || value === null || value === '') {
    throw new Error(`Campo obrigatorio ausente: ${label}`);
  }

  return value;
}

async function main() {
  const backup = JSON.parse(fs.readFileSync(backupPath, 'utf8'));
  const data = backup.data || {};

  const client = new Client({
    connectionString: process.env.DIRECT_URL || process.env.DATABASE_URL,
  });

  await client.connect();
  await client.query('BEGIN');

  try {
    for (const company of data.companies || []) {
      await client.query(
        `
          insert into empresas (
            id,
            nome_fantasia,
            razao_social,
            documento,
            telefone,
            email,
            ativo,
            criado_em,
            atualizado_em
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          on conflict (id) do update
          set nome_fantasia = excluded.nome_fantasia,
              razao_social = excluded.razao_social,
              documento = excluded.documento,
              telefone = excluded.telefone,
              email = excluded.email,
              ativo = excluded.ativo,
              atualizado_em = excluded.atualizado_em
        `,
        [
          required(company.id, 'company.id'),
          required(company.tradeName, 'company.tradeName'),
          company.companyName || null,
          company.document || null,
          company.phone || null,
          company.email || null,
          company.isActive !== false,
          company.createdAt || new Date().toISOString(),
          company.updatedAt || new Date().toISOString(),
        ],
      );
    }

    for (const user of data.users || []) {
      const normalizedEmail = required(user.email, 'user.email').toLowerCase();
      const role = ADMIN_EMAILS.has(normalizedEmail)
        ? 'DONO_SISTEMA'
        : roleMap[user.role] || 'USER';

      await client.query(
        `
          insert into usuarios (
            id,
            empresa_id,
            nome,
            email,
            senha_hash,
            papel,
            ativo,
            criado_em,
            atualizado_em
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9)
          on conflict (id) do update
          set empresa_id = excluded.empresa_id,
              nome = excluded.nome,
              email = excluded.email,
              senha_hash = excluded.senha_hash,
              papel = excluded.papel,
              ativo = excluded.ativo,
              atualizado_em = excluded.atualizado_em
        `,
        [
          required(user.id, 'user.id'),
          required(user.companyId, 'user.companyId'),
          required(user.name, 'user.name'),
          normalizedEmail,
          required(user.passwordHash, 'user.passwordHash'),
          role,
          user.isActive !== false,
          user.createdAt || new Date().toISOString(),
          user.updatedAt || new Date().toISOString(),
        ],
      );
    }

    for (const person of data.people || []) {
      await client.query(
        `
          insert into pessoas (
            id,
            empresa_id,
            tipo,
            status,
            nome,
            documento,
            inscricao_estadual,
            rg,
            email,
            telefone,
            cep,
            cidade,
            estado,
            endereco,
            criado_em,
            atualizado_em
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
          on conflict (id) do update
          set empresa_id = excluded.empresa_id,
              tipo = excluded.tipo,
              status = excluded.status,
              nome = excluded.nome,
              documento = excluded.documento,
              inscricao_estadual = excluded.inscricao_estadual,
              rg = excluded.rg,
              email = excluded.email,
              telefone = excluded.telefone,
              cep = excluded.cep,
              cidade = excluded.cidade,
              estado = excluded.estado,
              endereco = excluded.endereco,
              atualizado_em = excluded.atualizado_em
        `,
        [
          required(person.id, 'person.id'),
          required(person.companyId, 'person.companyId'),
          personTypeMap[person.type] || 'PESSOA_FISICA',
          personStatusMap[person.status] || 'ATIVO',
          required(person.name, 'person.name'),
          required(person.document, 'person.document'),
          person.stateRegistration || null,
          person.identityNumber || null,
          person.email || null,
          person.phone || null,
          person.zipCode || null,
          person.city || null,
          person.state || null,
          person.address || null,
          person.createdAt || new Date().toISOString(),
          person.updatedAt || new Date().toISOString(),
        ],
      );
    }

    for (const property of data.properties || []) {
      await client.query(
        `
          insert into imoveis (
            id,
            empresa_id,
            proprietario_id,
            titulo,
            codigo,
            tipo,
            finalidade,
            valor_aluguel,
            cep,
            cidade,
            estado,
            endereco,
            bairro,
            numero,
            complemento,
            quartos,
            banheiros,
            garagens,
            descricao,
            ativo,
            criado_em,
            atualizado_em
          )
          values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)
          on conflict (id) do update
          set empresa_id = excluded.empresa_id,
              proprietario_id = excluded.proprietario_id,
              titulo = excluded.titulo,
              codigo = excluded.codigo,
              tipo = excluded.tipo,
              finalidade = excluded.finalidade,
              valor_aluguel = excluded.valor_aluguel,
              cep = excluded.cep,
              cidade = excluded.cidade,
              estado = excluded.estado,
              endereco = excluded.endereco,
              bairro = excluded.bairro,
              numero = excluded.numero,
              complemento = excluded.complemento,
              quartos = excluded.quartos,
              banheiros = excluded.banheiros,
              garagens = excluded.garagens,
              descricao = excluded.descricao,
              ativo = excluded.ativo,
              atualizado_em = excluded.atualizado_em
        `,
        [
          required(property.id, 'property.id'),
          required(property.companyId, 'property.companyId'),
          property.ownerId || null,
          required(property.title, 'property.title'),
          property.code || null,
          property.type || null,
          property.purpose || null,
          property.rentalValue || null,
          property.zipCode || null,
          property.city || null,
          property.state || null,
          property.address || null,
          property.district || null,
          property.number || null,
          property.complement || null,
          property.bedrooms || null,
          property.bathrooms || null,
          property.garages || null,
          property.description || null,
          property.isActive !== false,
          property.createdAt || new Date().toISOString(),
          property.updatedAt || new Date().toISOString(),
        ],
      );
    }

    const firstCompany = data.companies?.[0];
    const adminUser = data.users?.find((user) =>
      ADMIN_EMAILS.has(String(user.email || '').toLowerCase()),
    );

    if (firstCompany && adminUser) {
      await client.query(
        `
          insert into configuracoes_app (
            id,
            empresa_id,
            configuracoes_usuario,
            configuracoes_empresa,
            configuracoes_tema,
            criado_em,
            atualizado_em
          )
          values (gen_random_uuid()::text, $1, $2::jsonb, $3::jsonb, $4::jsonb, now(), now())
          on conflict (empresa_id) do update
          set configuracoes_usuario = excluded.configuracoes_usuario,
              configuracoes_empresa = excluded.configuracoes_empresa,
              configuracoes_tema = excluded.configuracoes_tema,
              atualizado_em = now()
        `,
        [
          firstCompany.id,
          JSON.stringify({
            name: adminUser.name,
            email: adminUser.email,
          }),
          JSON.stringify({
            companyName: firstCompany.companyName,
            tradeName: firstCompany.tradeName,
            email: firstCompany.email,
            phone: firstCompany.phone,
            document: firstCompany.document,
          }),
          JSON.stringify({ mode: 'light' }),
        ],
      );
    }

    await client.query('COMMIT');
    console.log(
      JSON.stringify(
        {
          companies: data.companies?.length || 0,
          users: data.users?.length || 0,
          people: data.people?.length || 0,
          properties: data.properties?.length || 0,
          contracts: data.contracts?.length || 0,
        },
        null,
        2,
      ),
    );
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
