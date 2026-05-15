-- CreateTable
CREATE TABLE "configuracoes_app" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "configuracoes_usuario" JSONB,
    "configuracoes_empresa" JSONB,
    "configuracoes_tema" JSONB,
    "modelos_impressao" JSONB,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "configuracoes_app_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "configuracoes_app_empresa_id_key" ON "configuracoes_app"("empresa_id");
CREATE INDEX "configuracoes_app_empresa_id_idx" ON "configuracoes_app"("empresa_id");

-- AddForeignKey
ALTER TABLE "configuracoes_app" ADD CONSTRAINT "configuracoes_app_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
