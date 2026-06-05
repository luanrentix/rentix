ALTER TABLE "usuarios"
  ADD COLUMN "token_recuperacao_senha_hash" TEXT,
  ADD COLUMN "token_recuperacao_senha_expira_em" TIMESTAMP(3);

CREATE INDEX "usuarios_token_recuperacao_senha_expira_em_idx"
  ON "usuarios"("token_recuperacao_senha_expira_em");
