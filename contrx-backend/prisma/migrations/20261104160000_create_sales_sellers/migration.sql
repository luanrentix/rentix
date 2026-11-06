CREATE TABLE "vendas_vendedores" (
    "id" TEXT NOT NULL,
    "codigo" SERIAL NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "cpf" TEXT,
    "telefone" TEXT,
    "email" TEXT,
    "comissao" DECIMAL(5,2) NOT NULL DEFAULT 0,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendas_vendedores_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendas_vendedores_codigo_key" ON "vendas_vendedores"("codigo");
CREATE UNIQUE INDEX "vendas_vendedores_empresa_id_cpf_key" ON "vendas_vendedores"("empresa_id", "cpf");
CREATE INDEX "vendas_vendedores_empresa_id_ativo_nome_idx" ON "vendas_vendedores"("empresa_id", "ativo", "nome");
ALTER TABLE "vendas_vendedores" ADD CONSTRAINT "vendas_vendedores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendas_vendedores" ENABLE ROW LEVEL SECURITY;
