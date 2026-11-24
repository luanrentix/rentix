ALTER TABLE "vendas_creditos_clientes"
  ADD COLUMN "codigo_vale" TEXT,
  ADD COLUMN "anonimo" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "vendas_pedidos" ADD COLUMN "codigo_vale" TEXT;

CREATE UNIQUE INDEX "vendas_creditos_clientes_empresa_id_codigo_vale_key"
  ON "vendas_creditos_clientes"("empresa_id", "codigo_vale");
CREATE INDEX "vendas_creditos_clientes_empresa_id_codigo_vale_estornado_em_idx"
  ON "vendas_creditos_clientes"("empresa_id", "codigo_vale", "estornado_em");
