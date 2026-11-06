BEGIN;
CREATE TABLE "vendas_variacoes_produtos" (
  "id" TEXT NOT NULL PRIMARY KEY, "empresa_id" TEXT NOT NULL, "produto_id" TEXT NOT NULL,
  "nome" TEXT NOT NULL, "codigo_barras" TEXT, "preco" DECIMAL(10,2),
  "estoque" DECIMAL(12,3) NOT NULL DEFAULT 0, "estoque_reservado" DECIMAL(12,3) NOT NULL DEFAULT 0,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT "vendas_variacoes_produtos_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "vendas_produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "vendas_variacoes_reserva_check" CHECK ("estoque_reservado" >= 0 AND "estoque" >= "estoque_reservado")
);
CREATE UNIQUE INDEX "vendas_variacoes_produtos_empresa_id_codigo_barras_key" ON "vendas_variacoes_produtos"("empresa_id", "codigo_barras");
CREATE UNIQUE INDEX "vendas_variacoes_produtos_produto_id_nome_key" ON "vendas_variacoes_produtos"("produto_id", "nome");
CREATE INDEX "vendas_variacoes_produtos_empresa_id_produto_id_ativo_idx" ON "vendas_variacoes_produtos"("empresa_id", "produto_id", "ativo");

-- Quantidades antigas continuam no produto. Nenhuma distribuição por tamanho/cor é presumida.
INSERT INTO "vendas_variacoes_produtos" ("id", "empresa_id", "produto_id", "nome")
SELECT gen_random_uuid()::text, p."empresa_id", p."id", trim(value)
FROM "vendas_produtos" p CROSS JOIN LATERAL unnest(string_to_array(p."variacoes", ',')) value
WHERE trim(value) <> '' GROUP BY p."empresa_id", p."id", trim(value);

ALTER TABLE "vendas_pedidos" ADD COLUMN "concluido_em" TIMESTAMP(3), ADD COLUMN "parcelas" INTEGER NOT NULL DEFAULT 1, ADD COLUMN "venda_original_id" TEXT,
  ADD COLUMN "itens_devolvidos" JSONB, ADD COLUMN "total_devolvido" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "divida_compensada" DECIMAL(10,2) NOT NULL DEFAULT 0, ADD COLUMN "destino_devolucao" TEXT,
  ADD COLUMN "ajustes_devolucao" JSONB;
ALTER TABLE "vendas_pedidos" ADD CONSTRAINT "vendas_pedidos_venda_original_id_fkey" FOREIGN KEY ("venda_original_id") REFERENCES "vendas_pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "vendas_pedidos_empresa_id_venda_original_id_idx" ON "vendas_pedidos"("empresa_id", "venda_original_id");
UPDATE "vendas_pedidos" SET "concluido_em" = "criado_em" WHERE "status" = 'CONCLUIDA' AND "tipo_venda" IN ('VENDA', 'TROCA');

CREATE TABLE "vendas_creditos_clientes" (
  "id" TEXT NOT NULL PRIMARY KEY, "empresa_id" TEXT NOT NULL, "cliente_id" TEXT NOT NULL,
  "venda_id" TEXT NOT NULL, "valor" DECIMAL(10,2) NOT NULL, "motivo" TEXT NOT NULL,
  "estornado_em" TIMESTAMP(3), "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendas_creditos_clientes_cliente_id_fkey" FOREIGN KEY ("cliente_id") REFERENCES "vendas_clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "vendas_creditos_clientes_empresa_id_cliente_id_estornado_em_idx" ON "vendas_creditos_clientes"("empresa_id", "cliente_id", "estornado_em");
CREATE INDEX "vendas_creditos_clientes_venda_id_idx" ON "vendas_creditos_clientes"("venda_id");
ALTER TABLE "vendas_variacoes_produtos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendas_creditos_clientes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "contas_pagar" ADD COLUMN "devolucao_venda_id" TEXT, ADD COLUMN "cancelado_em" TIMESTAMP(3);
ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_devolucao_venda_id_fkey" FOREIGN KEY ("devolucao_venda_id") REFERENCES "vendas_pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "contas_pagar_empresa_id_devolucao_venda_id_cancelado_em_idx" ON "contas_pagar"("empresa_id", "devolucao_venda_id", "cancelado_em");
COMMIT;
