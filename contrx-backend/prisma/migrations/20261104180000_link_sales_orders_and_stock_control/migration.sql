ALTER TABLE "vendas_produtos"
  ADD COLUMN "controlar_estoque" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "vendas_pedidos"
  ADD COLUMN "vendedor_id" TEXT,
  ADD COLUMN "cliente_id" TEXT,
  ADD COLUMN "estoque_aplicado" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX "vendas_pedidos_empresa_id_cliente_id_idx" ON "vendas_pedidos"("empresa_id", "cliente_id");
CREATE INDEX "vendas_pedidos_empresa_id_vendedor_id_idx" ON "vendas_pedidos"("empresa_id", "vendedor_id");
ALTER TABLE "vendas_pedidos" ADD CONSTRAINT "vendas_pedidos_vendedor_id_fkey" FOREIGN KEY ("vendedor_id") REFERENCES "vendas_vendedores"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendas_pedidos" ADD CONSTRAINT "vendas_pedidos_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "vendas_clientes"("id") ON DELETE SET NULL ON UPDATE CASCADE;
