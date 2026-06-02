CREATE TYPE "status_assinatura_empresa" AS ENUM (
  'TESTE',
  'ATIVO',
  'VENCIDO',
  'SUSPENSO',
  'CANCELADO'
);

ALTER TABLE "empresas"
  ADD COLUMN "status_assinatura" "status_assinatura_empresa" NOT NULL DEFAULT 'ATIVO',
  ADD COLUMN "teste_inicia_em" TIMESTAMP(3),
  ADD COLUMN "teste_termina_em" TIMESTAMP(3),
  ADD COLUMN "teste_prorrogado_ate" TIMESTAMP(3),
  ADD COLUMN "assinatura_termina_em" TIMESTAMP(3);

ALTER TABLE "empresas"
  ALTER COLUMN "status_assinatura" SET DEFAULT 'TESTE';

CREATE INDEX "empresas_status_assinatura_idx" ON "empresas"("status_assinatura");
CREATE INDEX "empresas_teste_termina_em_idx" ON "empresas"("teste_termina_em");
