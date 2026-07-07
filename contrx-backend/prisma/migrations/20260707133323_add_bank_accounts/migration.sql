-- CreateEnum
CREATE TYPE "ContractSignatureStatus" AS ENUM ('PENDING', 'SIGNED');

-- CreateEnum
CREATE TYPE "SignerRole" AS ENUM ('LANDLORD', 'TENANT', 'GUARANTOR', 'WITNESS');

-- CreateEnum
CREATE TYPE "BankAccountType" AS ENUM ('CHECKING', 'SAVINGS', 'INVESTMENT', 'CASH');

-- CreateEnum
CREATE TYPE "BankTransactionType" AS ENUM ('INFLOW', 'OUTFLOW');

-- CreateEnum
CREATE TYPE "BankTransactionStatus" AS ENUM ('PENDING', 'CONFIRMED');

-- DropForeignKey
ALTER TABLE "pagamentos_realizados" DROP CONSTRAINT IF EXISTS "pagamentos_realizados_conta_pagar_id_fkey";

-- DropForeignKey
ALTER TABLE "pagamentos_recebidos" DROP CONSTRAINT IF EXISTS "pagamentos_recebidos_conta_receber_id_fkey";

-- DropIndex
DROP INDEX IF EXISTS "empresas_status_assinatura_idx";

-- DropIndex
DROP INDEX IF EXISTS "empresas_teste_termina_em_idx";

-- DropIndex
DROP INDEX IF EXISTS "usuarios_token_recuperacao_senha_expira_em_idx";

-- CreateTable
CREATE TABLE "assinaturas_contrato" (
    "id" TEXT NOT NULL,
    "contrato_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "papel" "SignerRole" NOT NULL DEFAULT 'TENANT',
    "status" "ContractSignatureStatus" NOT NULL DEFAULT 'PENDING',
    "token_acesso" TEXT NOT NULL,
    "assinado_em" TIMESTAMP(3),
    "endereco_ip" TEXT,
    "agente_usuario" TEXT,
    "hash_documento" TEXT,

    CONSTRAINT "assinaturas_contrato_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_bancarias" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "tipo" "BankAccountType" NOT NULL DEFAULT 'CHECKING',
    "agencia" TEXT,
    "numero_conta" TEXT,
    "codigo_banco" TEXT,
    "nome_banco" TEXT,
    "saldo_inicial" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "saldo_atual" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "limite" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "moeda" TEXT NOT NULL DEFAULT 'BRL',
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "deletado_em" TIMESTAMP(3),
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimentacoes_bancarias" (
    "id" TEXT NOT NULL,
    "conta_bancaria_id" TEXT NOT NULL,
    "tipo" "BankTransactionType" NOT NULL,
    "status" "BankTransactionStatus" NOT NULL DEFAULT 'PENDING',
    "valor" DECIMAL(10,2) NOT NULL,
    "taxa" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "descricao" TEXT NOT NULL,
    "data_competencia" TIMESTAMP(3) NOT NULL,
    "data_pagamento" TIMESTAMP(3),
    "categoria" TEXT,
    "tipo_referencia" TEXT,
    "id_referencia" TEXT,
    "grupo_transferencia_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimentacoes_bancarias_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "assinaturas_contrato_token_acesso_key" ON "assinaturas_contrato"("token_acesso");

-- CreateIndex
CREATE INDEX "assinaturas_contrato_contrato_id_idx" ON "assinaturas_contrato"("contrato_id");

-- CreateIndex
CREATE INDEX "contas_bancarias_empresa_id_idx" ON "contas_bancarias"("empresa_id");

-- CreateIndex
CREATE INDEX "movimentacoes_bancarias_conta_bancaria_id_idx" ON "movimentacoes_bancarias"("conta_bancaria_id");

-- CreateIndex
CREATE INDEX "movimentacoes_bancarias_data_competencia_idx" ON "movimentacoes_bancarias"("data_competencia");

-- AddForeignKey
ALTER TABLE "pagamentos_recebidos" ADD CONSTRAINT "pagamentos_recebidos_conta_receber_id_fkey" FOREIGN KEY ("conta_receber_id") REFERENCES "contas_receber"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pagamentos_realizados" ADD CONSTRAINT "pagamentos_realizados_conta_pagar_id_fkey" FOREIGN KEY ("conta_pagar_id") REFERENCES "contas_pagar"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "assinaturas_contrato" ADD CONSTRAINT "assinaturas_contrato_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contas_bancarias" ADD CONSTRAINT "contas_bancarias_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimentacoes_bancarias" ADD CONSTRAINT "movimentacoes_bancarias_conta_bancaria_id_fkey" FOREIGN KEY ("conta_bancaria_id") REFERENCES "contas_bancarias"("id") ON DELETE CASCADE ON UPDATE CASCADE;
