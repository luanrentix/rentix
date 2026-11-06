CREATE TABLE "vendas_grades_produtos" (
  "id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "valores" TEXT NOT NULL,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "vendas_grades_produtos_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "vendas_grades_produtos_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "vendas_grades_produtos_empresa_id_nome_key" ON "vendas_grades_produtos"("empresa_id", "nome");
CREATE INDEX "vendas_grades_produtos_empresa_id_ativo_nome_idx" ON "vendas_grades_produtos"("empresa_id", "ativo", "nome");
