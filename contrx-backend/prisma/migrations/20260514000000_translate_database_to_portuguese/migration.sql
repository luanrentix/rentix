-- Rename enum types and values to Portuguese without recreating data.
ALTER TYPE "UserRole" RENAME TO "papel_usuario";
ALTER TYPE "papel_usuario" RENAME VALUE 'OWNER' TO 'PROPRIETARIO';
ALTER TYPE "papel_usuario" RENAME VALUE 'ADMIN' TO 'ADMINISTRADOR';
ALTER TYPE "papel_usuario" RENAME VALUE 'MANAGER' TO 'GERENTE';

ALTER TYPE "PersonType" RENAME TO "tipo_pessoa";
ALTER TYPE "tipo_pessoa" RENAME VALUE 'INDIVIDUAL' TO 'PESSOA_FISICA';
ALTER TYPE "tipo_pessoa" RENAME VALUE 'COMPANY' TO 'PESSOA_JURIDICA';

ALTER TYPE "PersonStatus" RENAME TO "status_pessoa";
ALTER TYPE "status_pessoa" RENAME VALUE 'ACTIVE' TO 'ATIVO';
ALTER TYPE "status_pessoa" RENAME VALUE 'INACTIVE' TO 'INATIVO';

ALTER TYPE "ContractStatus" RENAME TO "status_contrato";
ALTER TYPE "status_contrato" RENAME VALUE 'ACTIVE' TO 'ATIVO';
ALTER TYPE "status_contrato" RENAME VALUE 'INACTIVE' TO 'INATIVO';
ALTER TYPE "status_contrato" RENAME VALUE 'CANCELED' TO 'CANCELADO';
ALTER TYPE "status_contrato" RENAME VALUE 'FINISHED' TO 'FINALIZADO';
ALTER TYPE "status_contrato" RENAME VALUE 'DELETED' TO 'EXCLUIDO';

ALTER TYPE "ContractStatusReasonType" RENAME TO "tipo_motivo_status_contrato";
ALTER TYPE "tipo_motivo_status_contrato" RENAME VALUE 'CANCELED' TO 'CANCELADO';
ALTER TYPE "tipo_motivo_status_contrato" RENAME VALUE 'DELETED' TO 'EXCLUIDO';

-- Rename tables.
ALTER TABLE "Company" RENAME TO "empresas";
ALTER TABLE "User" RENAME TO "usuarios";
ALTER TABLE "Person" RENAME TO "pessoas";
ALTER TABLE "Property" RENAME TO "imoveis";
ALTER TABLE "Contract" RENAME TO "contratos";

-- Rename Company columns.
ALTER TABLE "empresas" RENAME COLUMN "tradeName" TO "nome_fantasia";
ALTER TABLE "empresas" RENAME COLUMN "companyName" TO "razao_social";
ALTER TABLE "empresas" RENAME COLUMN "document" TO "documento";
ALTER TABLE "empresas" RENAME COLUMN "phone" TO "telefone";
ALTER TABLE "empresas" RENAME COLUMN "isActive" TO "ativo";
ALTER TABLE "empresas" RENAME COLUMN "createdAt" TO "criado_em";
ALTER TABLE "empresas" RENAME COLUMN "updatedAt" TO "atualizado_em";

-- Rename User columns.
ALTER TABLE "usuarios" RENAME COLUMN "companyId" TO "empresa_id";
ALTER TABLE "usuarios" RENAME COLUMN "name" TO "nome";
ALTER TABLE "usuarios" RENAME COLUMN "passwordHash" TO "senha_hash";
ALTER TABLE "usuarios" RENAME COLUMN "role" TO "papel";
ALTER TABLE "usuarios" RENAME COLUMN "isActive" TO "ativo";
ALTER TABLE "usuarios" RENAME COLUMN "createdAt" TO "criado_em";
ALTER TABLE "usuarios" RENAME COLUMN "updatedAt" TO "atualizado_em";

-- Rename Person columns.
ALTER TABLE "pessoas" RENAME COLUMN "companyId" TO "empresa_id";
ALTER TABLE "pessoas" RENAME COLUMN "type" TO "tipo";
ALTER TABLE "pessoas" RENAME COLUMN "name" TO "nome";
ALTER TABLE "pessoas" RENAME COLUMN "document" TO "documento";
ALTER TABLE "pessoas" RENAME COLUMN "stateRegistration" TO "inscricao_estadual";
ALTER TABLE "pessoas" RENAME COLUMN "identityNumber" TO "rg";
ALTER TABLE "pessoas" RENAME COLUMN "phone" TO "telefone";
ALTER TABLE "pessoas" RENAME COLUMN "zipCode" TO "cep";
ALTER TABLE "pessoas" RENAME COLUMN "city" TO "cidade";
ALTER TABLE "pessoas" RENAME COLUMN "state" TO "estado";
ALTER TABLE "pessoas" RENAME COLUMN "address" TO "endereco";
ALTER TABLE "pessoas" RENAME COLUMN "createdAt" TO "criado_em";
ALTER TABLE "pessoas" RENAME COLUMN "updatedAt" TO "atualizado_em";

-- Rename Property columns.
ALTER TABLE "imoveis" RENAME COLUMN "companyId" TO "empresa_id";
ALTER TABLE "imoveis" RENAME COLUMN "ownerId" TO "proprietario_id";
ALTER TABLE "imoveis" RENAME COLUMN "title" TO "titulo";
ALTER TABLE "imoveis" RENAME COLUMN "code" TO "codigo";
ALTER TABLE "imoveis" RENAME COLUMN "type" TO "tipo";
ALTER TABLE "imoveis" RENAME COLUMN "purpose" TO "finalidade";
ALTER TABLE "imoveis" RENAME COLUMN "rentalValue" TO "valor_aluguel";
ALTER TABLE "imoveis" RENAME COLUMN "zipCode" TO "cep";
ALTER TABLE "imoveis" RENAME COLUMN "city" TO "cidade";
ALTER TABLE "imoveis" RENAME COLUMN "state" TO "estado";
ALTER TABLE "imoveis" RENAME COLUMN "address" TO "endereco";
ALTER TABLE "imoveis" RENAME COLUMN "district" TO "bairro";
ALTER TABLE "imoveis" RENAME COLUMN "number" TO "numero";
ALTER TABLE "imoveis" RENAME COLUMN "complement" TO "complemento";
ALTER TABLE "imoveis" RENAME COLUMN "bedrooms" TO "quartos";
ALTER TABLE "imoveis" RENAME COLUMN "bathrooms" TO "banheiros";
ALTER TABLE "imoveis" RENAME COLUMN "garages" TO "garagens";
ALTER TABLE "imoveis" RENAME COLUMN "description" TO "descricao";
ALTER TABLE "imoveis" RENAME COLUMN "isActive" TO "ativo";
ALTER TABLE "imoveis" RENAME COLUMN "createdAt" TO "criado_em";
ALTER TABLE "imoveis" RENAME COLUMN "updatedAt" TO "atualizado_em";

-- Rename Contract columns.
ALTER TABLE "contratos" RENAME COLUMN "companyId" TO "empresa_id";
ALTER TABLE "contratos" RENAME COLUMN "propertyId" TO "imovel_id";
ALTER TABLE "contratos" RENAME COLUMN "tenantId" TO "inquilino_id";
ALTER TABLE "contratos" RENAME COLUMN "propertyName" TO "nome_imovel";
ALTER TABLE "contratos" RENAME COLUMN "tenantName" TO "nome_inquilino";
ALTER TABLE "contratos" RENAME COLUMN "startDate" TO "data_inicio";
ALTER TABLE "contratos" RENAME COLUMN "endDate" TO "data_fim";
ALTER TABLE "contratos" RENAME COLUMN "rentValue" TO "valor_aluguel";
ALTER TABLE "contratos" RENAME COLUMN "deletedAt" TO "excluido_em";
ALTER TABLE "contratos" RENAME COLUMN "statusReason" TO "motivo_status";
ALTER TABLE "contratos" RENAME COLUMN "statusReasonType" TO "tipo_motivo_status";
ALTER TABLE "contratos" RENAME COLUMN "statusReasonAt" TO "motivo_status_em";
ALTER TABLE "contratos" RENAME COLUMN "isTemporaryRental" TO "locacao_temporaria";
ALTER TABLE "contratos" RENAME COLUMN "checkInTime" TO "horario_entrada";
ALTER TABLE "contratos" RENAME COLUMN "checkOutTime" TO "horario_saida";
ALTER TABLE "contratos" RENAME COLUMN "renewedAt" TO "renovado_em";
ALTER TABLE "contratos" RENAME COLUMN "renewalHistory" TO "historico_renovacoes";
ALTER TABLE "contratos" RENAME COLUMN "finishedAt" TO "finalizado_em";
ALTER TABLE "contratos" RENAME COLUMN "finishReason" TO "motivo_finalizacao";
ALTER TABLE "contratos" RENAME COLUMN "createdAt" TO "criado_em";
ALTER TABLE "contratos" RENAME COLUMN "updatedAt" TO "atualizado_em";

-- Rename primary keys, foreign keys and indexes for readability in Supabase.
ALTER TABLE "empresas" RENAME CONSTRAINT "Company_pkey" TO "empresas_pkey";
ALTER TABLE "usuarios" RENAME CONSTRAINT "User_pkey" TO "usuarios_pkey";
ALTER TABLE "pessoas" RENAME CONSTRAINT "Person_pkey" TO "pessoas_pkey";
ALTER TABLE "imoveis" RENAME CONSTRAINT "Property_pkey" TO "imoveis_pkey";
ALTER TABLE "contratos" RENAME CONSTRAINT "Contract_pkey" TO "contratos_pkey";

ALTER TABLE "usuarios" RENAME CONSTRAINT "User_companyId_fkey" TO "usuarios_empresa_id_fkey";
ALTER TABLE "pessoas" RENAME CONSTRAINT "Person_companyId_fkey" TO "pessoas_empresa_id_fkey";
ALTER TABLE "imoveis" RENAME CONSTRAINT "Property_companyId_fkey" TO "imoveis_empresa_id_fkey";
ALTER TABLE "imoveis" RENAME CONSTRAINT "Property_ownerId_fkey" TO "imoveis_proprietario_id_fkey";
ALTER TABLE "contratos" RENAME CONSTRAINT "Contract_companyId_fkey" TO "contratos_empresa_id_fkey";
ALTER TABLE "contratos" RENAME CONSTRAINT "Contract_propertyId_fkey" TO "contratos_imovel_id_fkey";
ALTER TABLE "contratos" RENAME CONSTRAINT "Contract_tenantId_fkey" TO "contratos_inquilino_id_fkey";

ALTER INDEX "User_email_key" RENAME TO "usuarios_email_key";
ALTER INDEX "Person_companyId_idx" RENAME TO "pessoas_empresa_id_idx";
ALTER INDEX "Person_document_idx" RENAME TO "pessoas_documento_idx";
ALTER INDEX "Property_companyId_idx" RENAME TO "imoveis_empresa_id_idx";
ALTER INDEX "Property_ownerId_idx" RENAME TO "imoveis_proprietario_id_idx";
ALTER INDEX "Contract_companyId_idx" RENAME TO "contratos_empresa_id_idx";
ALTER INDEX "Contract_propertyId_idx" RENAME TO "contratos_imovel_id_idx";
ALTER INDEX "Contract_tenantId_idx" RENAME TO "contratos_inquilino_id_idx";
ALTER INDEX "Contract_status_idx" RENAME TO "contratos_status_idx";
