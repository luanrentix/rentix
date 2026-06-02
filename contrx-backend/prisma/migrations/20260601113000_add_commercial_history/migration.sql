CREATE TABLE "historico_comercial" (
  "id" TEXT NOT NULL,
  "empresa_id" TEXT NOT NULL,
  "usuario_id" TEXT,
  "acao" TEXT NOT NULL,
  "descricao" TEXT NOT NULL,
  "metadados" JSONB,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "historico_comercial_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "historico_comercial_empresa_id_idx" ON "historico_comercial"("empresa_id");
CREATE INDEX "historico_comercial_criado_em_idx" ON "historico_comercial"("criado_em");

ALTER TABLE "historico_comercial"
  ADD CONSTRAINT "historico_comercial_empresa_id_fkey"
  FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;
