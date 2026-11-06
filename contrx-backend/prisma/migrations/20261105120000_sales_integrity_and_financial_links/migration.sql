BEGIN;
ALTER TABLE "vendas_produtos" ADD COLUMN "fornecedor_id" TEXT;
ALTER TABLE "vendas_produtos" ADD COLUMN "estoque_reservado" DECIMAL(12,3) NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "vendas_fornecedores_id_empresa_id_key" ON "vendas_fornecedores"("id", "empresa_id");
ALTER TABLE "vendas_produtos" ADD CONSTRAINT "vendas_produtos_fornecedor_id_empresa_id_fkey"
  FOREIGN KEY ("fornecedor_id", "empresa_id") REFERENCES "vendas_fornecedores"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Somente nomes sem ambiguidade dentro da empresa são associados automaticamente.
WITH unique_suppliers AS (
  SELECT "empresa_id", upper(trim("nome")) AS name, min("id") AS id
  FROM "vendas_fornecedores" GROUP BY "empresa_id", upper(trim("nome")) HAVING count(*) = 1
)
UPDATE "vendas_produtos" p SET "fornecedor_id" = s.id FROM unique_suppliers s
WHERE p."empresa_id" = s."empresa_id" AND upper(trim(p."fornecedor")) = s.name;

ALTER TABLE "vendas_pedidos"
  ADD COLUMN "estoque_reservado" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "versao" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN "requisicao_id" TEXT,
  ADD COLUMN "conta_bancaria_id" TEXT,
  ADD COLUMN "total_comissao" DECIMAL(10,2) NOT NULL DEFAULT 0;
CREATE UNIQUE INDEX "vendas_pedidos_empresa_id_requisicao_id_key" ON "vendas_pedidos"("empresa_id", "requisicao_id");

-- Condicionais antigos baixavam o estoque físico. Converter essa baixa em reserva.
WITH conditional_quantities AS (
  SELECT o."empresa_id", item->>'productId' AS product_id, sum((item->>'quantity')::numeric) AS quantity
  FROM "vendas_pedidos" o CROSS JOIN LATERAL jsonb_array_elements(o."itens") item
  WHERE o."tipo_venda" = 'CONDICIONAL' AND o."status" = 'CONCLUIDA' AND o."estoque_aplicado" = true
    AND item->>'stockManaged' = 'true'
  GROUP BY o."empresa_id", item->>'productId'
)
UPDATE "vendas_produtos" p SET "estoque" = p."estoque" + q.quantity, "estoque_reservado" = q.quantity
FROM conditional_quantities q WHERE p."id" = q.product_id AND p."empresa_id" = q."empresa_id";
UPDATE "vendas_pedidos" SET "estoque_aplicado" = false, "estoque_reservado" = true
WHERE "tipo_venda" = 'CONDICIONAL' AND "status" = 'CONCLUIDA' AND "estoque_aplicado" = true;

ALTER TABLE "contas_receber" ADD COLUMN "venda_id" TEXT, ADD COLUMN "cliente_venda_id" TEXT, ADD COLUMN "cancelado_em" TIMESTAMP(3);
ALTER TABLE "contas_receber" ADD CONSTRAINT "contas_receber_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas_pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
CREATE INDEX "contas_receber_empresa_id_cliente_venda_id_cancelado_em_idx" ON "contas_receber"("empresa_id", "cliente_venda_id", "cancelado_em");
CREATE INDEX "contas_receber_venda_id_idx" ON "contas_receber"("venda_id");

CREATE TABLE "vendas_eventos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "venda_id" TEXT NOT NULL,
  "acao" TEXT NOT NULL,
  "detalhes" JSONB NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendas_eventos_venda_id_fkey" FOREIGN KEY ("venda_id") REFERENCES "vendas_pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "vendas_eventos_venda_id_criado_em_idx" ON "vendas_eventos"("venda_id", "criado_em");
CREATE TABLE "vendas_movimentos_estoque" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa_id" TEXT NOT NULL,
  "produto_id" TEXT NOT NULL,
  "variacao_estoque" DECIMAL(12,3) NOT NULL,
  "variacao_reserva" DECIMAL(12,3) NOT NULL,
  "motivo" TEXT NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendas_movimentos_estoque_produto_id_fkey" FOREIGN KEY ("produto_id") REFERENCES "vendas_produtos"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "vendas_movimentos_estoque_empresa_id_produto_id_criado_em_idx" ON "vendas_movimentos_estoque"("empresa_id", "produto_id", "criado_em");
ALTER TABLE "vendas_produtos" ADD CONSTRAINT "vendas_produtos_reserva_valida_check" CHECK ("estoque_reservado" >= 0 AND "estoque" >= "estoque_reservado") NOT VALID;
ALTER TABLE "vendas_eventos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendas_movimentos_estoque" ENABLE ROW LEVEL SECURITY;
COMMIT;
