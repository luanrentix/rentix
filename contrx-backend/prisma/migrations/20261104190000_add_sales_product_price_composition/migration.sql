ALTER TABLE "vendas_produtos"
  ADD COLUMN "custo_compra" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "custo_adicional" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "markup_percentual" DECIMAL(7,2) NOT NULL DEFAULT 0,
  ADD COLUMN "preco_promocional" DECIMAL(10,2);
