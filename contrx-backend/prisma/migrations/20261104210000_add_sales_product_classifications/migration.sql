CREATE TABLE "vendas_categorias_produtos" (
  "id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendas_categorias_produtos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vendas_categorias_produtos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE "vendas_marcas_produtos" (
  "id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendas_marcas_produtos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vendas_marcas_produtos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "vendas_categorias_produtos_empresa_id_nome_key" ON "vendas_categorias_produtos"("empresa_id", "nome");
CREATE INDEX "vendas_categorias_produtos_empresa_id_ativo_nome_idx" ON "vendas_categorias_produtos"("empresa_id", "ativo", "nome");
CREATE UNIQUE INDEX "vendas_marcas_produtos_empresa_id_nome_key" ON "vendas_marcas_produtos"("empresa_id", "nome");
CREATE INDEX "vendas_marcas_produtos_empresa_id_ativo_nome_idx" ON "vendas_marcas_produtos"("empresa_id", "ativo", "nome");
