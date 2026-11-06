ALTER TABLE "vendas_produtos"
  ADD COLUMN "markup_multiplicador" DECIMAL(7, 2) NOT NULL DEFAULT 1;

UPDATE "vendas_produtos"
SET "markup_multiplicador" = GREATEST(0, 1 + ("markup_percentual" / 100));
