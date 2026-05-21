ALTER TABLE "agenda_itens"
  ADD COLUMN IF NOT EXISTS "pessoa_id" TEXT,
  ADD COLUMN IF NOT EXISTS "imovel_id" TEXT;

ALTER TABLE "agenda_itens"
  ALTER COLUMN "cliente" SET DEFAULT '',
  ALTER COLUMN "imovel" SET DEFAULT '';

CREATE INDEX IF NOT EXISTS "agenda_itens_pessoa_id_idx" ON "agenda_itens"("pessoa_id");
CREATE INDEX IF NOT EXISTS "agenda_itens_imovel_id_idx" ON "agenda_itens"("imovel_id");
