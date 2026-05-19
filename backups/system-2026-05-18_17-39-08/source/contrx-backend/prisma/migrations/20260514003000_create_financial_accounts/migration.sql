-- CreateEnum
CREATE TYPE "status_conta_financeira" AS ENUM ('PENDENTE', 'PAGO');

-- CreateEnum
CREATE TYPE "forma_pagamento" AS ENUM (
    'DINHEIRO',
    'PIX',
    'CARTAO_CREDITO',
    'CARTAO_DEBITO',
    'BOLETO',
    'TRANSFERENCIA',
    'OUTRO'
);

-- CreateTable
CREATE TABLE "contas_receber" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "contrato_id" TEXT,
    "inquilino_id" TEXT,
    "imovel" TEXT NOT NULL,
    "inquilino" TEXT NOT NULL,
    "data_lancamento" TIMESTAMP(3),
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "valor" DECIMAL(10,2) NOT NULL,
    "status" "status_conta_financeira" NOT NULL DEFAULT 'PENDENTE',
    "manual" BOOLEAN NOT NULL DEFAULT true,
    "numero_parcela" INTEGER,
    "total_parcelas" INTEGER,
    "grupo_parcelamento_id" TEXT,
    "entrada" BOOLEAN NOT NULL DEFAULT false,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_receber_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos_recebidos" (
    "id" TEXT NOT NULL,
    "conta_receber_id" TEXT NOT NULL,
    "pago_em" TIMESTAMP(3) NOT NULL,
    "forma_pagamento" "forma_pagamento" NOT NULL,
    "itens_pagamento" JSONB,
    "juros" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_pago" DECIMAL(10,2) NOT NULL,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_recebidos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contas_pagar" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "pessoa_id" TEXT,
    "pessoa" TEXT,
    "descricao" TEXT NOT NULL,
    "categoria" TEXT,
    "observacao" TEXT,
    "valor" DECIMAL(10,2) NOT NULL,
    "data_lancamento" TIMESTAMP(3),
    "data_vencimento" TIMESTAMP(3) NOT NULL,
    "status" "status_conta_financeira" NOT NULL DEFAULT 'PENDENTE',
    "manual" BOOLEAN NOT NULL DEFAULT true,
    "numero_parcela" INTEGER,
    "total_parcelas" INTEGER,
    "grupo_parcelamento_id" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contas_pagar_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pagamentos_realizados" (
    "id" TEXT NOT NULL,
    "conta_pagar_id" TEXT NOT NULL,
    "pago_em" TIMESTAMP(3) NOT NULL,
    "forma_pagamento" "forma_pagamento" NOT NULL,
    "itens_pagamento" JSONB,
    "juros" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "desconto" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "valor_pago" DECIMAL(10,2) NOT NULL,
    "observacao" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pagamentos_realizados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "contas_receber_empresa_id_idx" ON "contas_receber"("empresa_id");
CREATE INDEX "contas_receber_contrato_id_idx" ON "contas_receber"("contrato_id");
CREATE INDEX "contas_receber_inquilino_id_idx" ON "contas_receber"("inquilino_id");
CREATE INDEX "contas_receber_status_idx" ON "contas_receber"("status");
CREATE INDEX "contas_receber_data_vencimento_idx" ON "contas_receber"("data_vencimento");

CREATE INDEX "pagamentos_recebidos_conta_receber_id_idx" ON "pagamentos_recebidos"("conta_receber_id");

CREATE INDEX "contas_pagar_empresa_id_idx" ON "contas_pagar"("empresa_id");
CREATE INDEX "contas_pagar_pessoa_id_idx" ON "contas_pagar"("pessoa_id");
CREATE INDEX "contas_pagar_status_idx" ON "contas_pagar"("status");
CREATE INDEX "contas_pagar_data_vencimento_idx" ON "contas_pagar"("data_vencimento");

CREATE INDEX "pagamentos_realizados_conta_pagar_id_idx" ON "pagamentos_realizados"("conta_pagar_id");

-- AddForeignKey
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_contrato_id_fkey" FOREIGN KEY ("contrato_id") REFERENCES "contratos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_inquilino_id_fkey" FOREIGN KEY ("inquilino_id") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pagamentos_recebidos" ADD CONSTRAINT "pagamentos_recebidos_conta_receber_id_fkey" FOREIGN KEY ("conta_receber_id") REFERENCES "contas_receber"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_pessoa_id_fkey" FOREIGN KEY ("pessoa_id") REFERENCES "pessoas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "pagamentos_realizados" ADD CONSTRAINT "pagamentos_realizados_conta_pagar_id_fkey" FOREIGN KEY ("conta_pagar_id") REFERENCES "contas_pagar"("id") ON DELETE CASCADE ON UPDATE CASCADE;
