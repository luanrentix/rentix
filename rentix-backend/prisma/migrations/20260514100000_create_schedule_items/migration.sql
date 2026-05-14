CREATE TABLE "agenda_itens" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "imovel" TEXT NOT NULL,
    "data" TIMESTAMP(3) NOT NULL,
    "horario" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "prioridade" TEXT NOT NULL DEFAULT 'medium',
    "responsavel" TEXT NOT NULL,
    "lembrete" TEXT NOT NULL,
    "observacoes" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agenda_itens_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "agenda_itens_empresa_id_idx" ON "agenda_itens"("empresa_id");
CREATE INDEX "agenda_itens_data_idx" ON "agenda_itens"("data");

ALTER TABLE "agenda_itens" ADD CONSTRAINT "agenda_itens_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
