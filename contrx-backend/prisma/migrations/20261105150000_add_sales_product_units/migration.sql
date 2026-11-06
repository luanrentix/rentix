CREATE TABLE "vendas_unidades_produtos" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "nome" VARCHAR(12) NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "vendas_unidades_produtos_empresa_id_nome_key" ON "vendas_unidades_produtos"("empresa_id", "nome");
CREATE INDEX "vendas_unidades_produtos_empresa_id_ativo_nome_idx" ON "vendas_unidades_produtos"("empresa_id", "ativo", "nome");
