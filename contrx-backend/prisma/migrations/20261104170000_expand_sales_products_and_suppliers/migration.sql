ALTER TABLE "vendas_produtos"
  ADD COLUMN "referencia" TEXT,
  ADD COLUMN "codigo_barras" TEXT,
  ADD COLUMN "codigo_fabrica" TEXT,
  ADD COLUMN "unidade" TEXT NOT NULL DEFAULT 'UN',
  ADD COLUMN "tipo" TEXT NOT NULL DEFAULT 'PRODUTO',
  ADD COLUMN "descricao" TEXT,
  ADD COLUMN "mostrar_venda" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "categoria" TEXT,
  ADD COLUMN "subcategoria" TEXT,
  ADD COLUMN "marca" TEXT,
  ADD COLUMN "tipo_produto" TEXT NOT NULL DEFAULT 'REVENDA',
  ADD COLUMN "observacao_interna" TEXT,
  ADD COLUMN "estoque" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN "estoque_minimo" DECIMAL(12,3) NOT NULL DEFAULT 0,
  ADD COLUMN "variacoes" TEXT,
  ADD COLUMN "comissao" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN "fornecedor" TEXT;

CREATE TABLE "vendas_fornecedores" (
  "id" TEXT NOT NULL,
  "codigo" SERIAL NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "nome" TEXT NOT NULL,
  "documento" TEXT,
  "contato" TEXT,
  "telefone" TEXT,
  "email" TEXT,
  "endereco" TEXT,
  "observacoes" TEXT,
  "ativo" BOOLEAN NOT NULL DEFAULT true,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "vendas_fornecedores_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "vendas_fornecedores_codigo_key" ON "vendas_fornecedores"("codigo");
CREATE UNIQUE INDEX "vendas_fornecedores_empresa_id_documento_key" ON "vendas_fornecedores"("empresa_id", "documento");
CREATE INDEX "vendas_fornecedores_empresa_id_ativo_nome_idx" ON "vendas_fornecedores"("empresa_id", "ativo", "nome");
ALTER TABLE "vendas_fornecedores" ADD CONSTRAINT "vendas_fornecedores_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "vendas_fornecedores" ENABLE ROW LEVEL SECURITY;
