-- Preparada para execução manual, com backend parado durante a transição.
BEGIN;
ALTER TABLE "empresas" ADD COLUMN "codigo_empresa" TEXT DEFAULT ('CTX-' || upper(replace(gen_random_uuid()::text, '-', '')));
ALTER TABLE "empresas" ALTER COLUMN "codigo_empresa" SET NOT NULL;
CREATE UNIQUE INDEX "empresas_codigo_empresa_key" ON "empresas"("codigo_empresa");
ALTER TABLE "usuarios" ADD COLUMN "usuario_login" TEXT,
 ADD COLUMN "limite_sessoes" INTEGER NOT NULL DEFAULT 1,
 ADD COLUMN "permissoes_acoes" JSONB;
-- Não derivar logins de e-mails: o administrador define os novos logins sem colisões.
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_limite_sessoes_check" CHECK ("limite_sessoes" BETWEEN 1 AND 20);
ALTER TABLE "usuarios" ADD CONSTRAINT "usuarios_login_normalizado_check" CHECK ("usuario_login" IS NULL OR "usuario_login" ~ '^[a-z0-9][a-z0-9._-]{1,59}$');
CREATE UNIQUE INDEX "usuarios_empresa_id_usuario_login_key" ON "usuarios"("empresa_id", "usuario_login");
CREATE UNIQUE INDEX "usuarios_id_empresa_id_key" ON "usuarios"("id", "empresa_id");
CREATE TABLE "usuarios_sessoes" (
 "id" TEXT PRIMARY KEY,
 "sessao_id" TEXT NOT NULL UNIQUE,
 "usuario_id" TEXT NOT NULL,
 "empresa_id" TEXT NOT NULL,
 "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "ultima_atividade_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "expira_em" TIMESTAMP(3) NOT NULL,
 "encerrado_em" TIMESTAMP(3),
 "motivo" TEXT,
 "responsavel_id" TEXT,
 "dispositivo" TEXT,
 CONSTRAINT "usuarios_sessoes_usuario_empresa_fk" FOREIGN KEY ("usuario_id", "empresa_id") REFERENCES "usuarios"("id", "empresa_id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE INDEX "usuarios_sessoes_empresa_usuario_ativas_idx" ON "usuarios_sessoes"("empresa_id", "usuario_id", "encerrado_em", "criado_em");
-- Importação única. Tokens legados nunca serão recriados sob demanda.
INSERT INTO "usuarios_sessoes" ("id", "sessao_id", "usuario_id", "empresa_id", "criado_em", "ultima_atividade_em", "expira_em", "dispositivo")
 SELECT gen_random_uuid()::text, "sessao_ativa_id", "id", "empresa_id", "ultimo_login_em", "ultimo_login_em", "ultimo_login_em" + interval '1 day', 'Sessão anterior à atualização'
 FROM "usuarios" WHERE "sessao_ativa_id" IS NOT NULL AND "ultimo_login_em" IS NOT NULL;
-- Acesso por API NestJS; não disponibilizar sessões via API pública do banco.
ALTER TABLE "usuarios_sessoes" ENABLE ROW LEVEL SECURITY;
COMMIT;
