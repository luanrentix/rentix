ALTER TABLE "vendas_produtos"
  ADD COLUMN "gerar_comissao" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "tipo_comissao" TEXT NOT NULL DEFAULT 'VENDEDOR',
  ADD COLUMN "regra_comissao" TEXT NOT NULL DEFAULT 'PADRAO';
