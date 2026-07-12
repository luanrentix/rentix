-- CreateTable
CREATE TABLE IF NOT EXISTS "extratos_compartilhados" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "conta_bancaria_id" TEXT,
    "data_inicio" TEXT,
    "data_fim" TEXT,
    "tipo" TEXT,
    "status" TEXT,
    "categoria" TEXT,
    "descricao" TEXT,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "extratos_compartilhados_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "extratos_compartilhados_empresa_id_idx" ON "extratos_compartilhados"("empresa_id");

-- AddForeignKey
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'extratos_compartilhados_empresa_id_fkey'
  ) THEN
    ALTER TABLE "extratos_compartilhados"
    ADD CONSTRAINT "extratos_compartilhados_empresa_id_fkey"
    FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$$;
