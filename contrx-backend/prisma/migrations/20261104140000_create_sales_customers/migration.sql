CREATE TABLE "vendas_clientes" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "documento" TEXT,
    "email" TEXT,
    "telefone" TEXT,
    "cep" TEXT,
    "endereco" TEXT,
    "numero" TEXT,
    "complemento" TEXT,
    "bairro" TEXT,
    "cidade" TEXT,
    "uf" TEXT,
    "observacoes" TEXT,
    "ativo" BOOLEAN NOT NULL DEFAULT true,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendas_clientes_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vendas_clientes_empresa_id_documento_key" ON "vendas_clientes"("empresa_id", "documento");
CREATE INDEX "vendas_clientes_empresa_id_ativo_nome_idx" ON "vendas_clientes"("empresa_id", "ativo", "nome");
ALTER TABLE "vendas_clientes" ADD CONSTRAINT "vendas_clientes_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendas_clientes" ENABLE ROW LEVEL SECURITY;
