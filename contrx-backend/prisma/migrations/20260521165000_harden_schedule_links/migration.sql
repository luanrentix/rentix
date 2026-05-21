UPDATE "agenda_itens"
SET "pessoa_id" = NULL
WHERE "pessoa_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "pessoas"
    WHERE "pessoas"."id" = "agenda_itens"."pessoa_id"
      AND "pessoas"."empresa_id" = "agenda_itens"."empresa_id"
  );

UPDATE "agenda_itens"
SET "imovel_id" = NULL
WHERE "imovel_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "imoveis"
    WHERE "imoveis"."id" = "agenda_itens"."imovel_id"
      AND "imoveis"."empresa_id" = "agenda_itens"."empresa_id"
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agenda_itens_pessoa_id_fkey'
  ) THEN
    ALTER TABLE "agenda_itens"
      ADD CONSTRAINT "agenda_itens_pessoa_id_fkey"
      FOREIGN KEY ("pessoa_id")
      REFERENCES "pessoas"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'agenda_itens_imovel_id_fkey'
  ) THEN
    ALTER TABLE "agenda_itens"
      ADD CONSTRAINT "agenda_itens_imovel_id_fkey"
      FOREIGN KEY ("imovel_id")
      REFERENCES "imoveis"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
