CREATE TABLE "movimentacoes_imoveis" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "imovel_id" TEXT NOT NULL,
    "nome_imovel" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "movimentacoes_imoveis_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "movimentacoes_imoveis_empresa_id_idx" ON "movimentacoes_imoveis"("empresa_id");
CREATE INDEX "movimentacoes_imoveis_imovel_id_idx" ON "movimentacoes_imoveis"("imovel_id");
CREATE INDEX "movimentacoes_imoveis_criado_em_idx" ON "movimentacoes_imoveis"("criado_em");

ALTER TABLE "movimentacoes_imoveis" ADD CONSTRAINT "movimentacoes_imoveis_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "movimentacoes_imoveis" ADD CONSTRAINT "movimentacoes_imoveis_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
