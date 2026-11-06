CREATE TABLE "vendas_produtos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "codigo" TEXT,
    "preco" DECIMAL(10,2) NOT NULL,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendas_produtos_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "vendas_pedidos" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "itens" JSONB NOT NULL,
    "total" DECIMAL(10,2) NOT NULL,
    "forma_pagamento" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'CONCLUIDA',
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "vendas_pedidos_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "vendas_produtos_empresa_id_ativo_idx" ON "vendas_produtos"("empresa_id", "ativo");
CREATE INDEX "vendas_pedidos_empresa_id_criado_em_idx" ON "vendas_pedidos"("empresa_id", "criado_em");
ALTER TABLE "vendas_produtos" ADD CONSTRAINT "vendas_produtos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendas_pedidos" ADD CONSTRAINT "vendas_pedidos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
