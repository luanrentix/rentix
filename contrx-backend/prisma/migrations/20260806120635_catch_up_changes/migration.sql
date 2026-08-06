-- CreateEnum
DO $ $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SystemFileType') THEN
    CREATE TYPE "SystemFileType" AS ENUM ('IMAGE', 'PDF', 'DOCUMENT', 'OTHER');
  END IF;
END
$ $;

-- CreateEnum
DO $ $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'SystemFileEntity') THEN
    CREATE TYPE "SystemFileEntity" AS ENUM ('PROPERTY', 'PERSON', 'CONTRACT', 'COMPANY', 'OTHER');
  END IF;
END
$ $;

-- DropForeignKey
ALTER TABLE IF EXISTS "extratos_compartilhados" DROP CONSTRAINT IF EXISTS "extratos_compartilhados_empresa_id_fkey";

-- AlterTable
ALTER TABLE "contratos" ADD COLUMN IF NOT EXISTS "contrato_assinado_pdf" TEXT;

-- AlterTable
ALTER TABLE "imoveis" ADD COLUMN IF NOT EXISTS "fotos" TEXT;

-- AlterTable
ALTER TABLE "pessoas" ADD COLUMN IF NOT EXISTS "foto" TEXT;

-- AlterTable
ALTER TABLE "usuarios" ADD COLUMN IF NOT EXISTS "ultimo_login_em" TIMESTAMP(3);

-- DropTable
DROP TABLE IF EXISTS "extratos_compartilhados";

-- CreateTable
CREATE TABLE IF NOT EXISTS "chamados_suporte" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "assunto" TEXT NOT NULL,
    "mensagem" TEXT NOT NULL,
    "resposta" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ABERTO',
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "chamados_suporte_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "impressos_compartilhados" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "conta_bancaria_id" TEXT,
    "tipo_documento" TEXT DEFAULT 'EXTRATO_BANCARIO',
    "cliente_id" TEXT,
    "data_inicio" TEXT,
    "data_fim" TEXT,
    "tipo" TEXT,
    "filtro_vencimento" TEXT,
    "status" TEXT,
    "categoria" TEXT,
    "descricao" TEXT,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "impressos_compartilhados_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "arquivos_sistema" (
    "id" TEXT NOT NULL,
    "empresa_id" TEXT NOT NULL,
    "tipo_entidade" "SystemFileEntity" NOT NULL,
    "entidade_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "tipo_arquivo" "SystemFileType" NOT NULL,
    "tamanho" INTEGER,
    "nome_original" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "arquivos_sistema_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chamados_suporte_usuario_id_idx" ON "chamados_suporte"("usuario_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "chamados_suporte_empresa_id_idx" ON "chamados_suporte"("empresa_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "impressos_compartilhados_empresa_id_idx" ON "impressos_compartilhados"("empresa_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "arquivos_sistema_empresa_id_idx" ON "arquivos_sistema"("empresa_id");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "arquivos_sistema_tipo_entidade_entidade_id_idx" ON "arquivos_sistema"("tipo_entidade", "entidade_id");

-- AddForeignKey
DO $ $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chamados_suporte_usuario_id_fkey') THEN
    ALTER TABLE "chamados_suporte" ADD CONSTRAINT "chamados_suporte_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$ $;

-- AddForeignKey
DO $ $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'chamados_suporte_empresa_id_fkey') THEN
    ALTER TABLE "chamados_suporte" ADD CONSTRAINT "chamados_suporte_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$ $;

-- AddForeignKey
DO $ $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'impressos_compartilhados_empresa_id_fkey') THEN
    ALTER TABLE "impressos_compartilhados" ADD CONSTRAINT "impressos_compartilhados_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$ $;

-- AddForeignKey
DO $ $
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'arquivos_sistema_empresa_id_fkey') THEN
    ALTER TABLE "arquivos_sistema" ADD CONSTRAINT "arquivos_sistema_empresa_id_fkey" FOREIGN KEY ("empresa_id") REFERENCES "empresas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END
$ $;

