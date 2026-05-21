ALTER TABLE "contas_pagar" ADD COLUMN IF NOT EXISTS "imovel_id" TEXT;

CREATE INDEX IF NOT EXISTS "contas_pagar_imovel_id_idx" ON "contas_pagar"("imovel_id");

UPDATE "contas_pagar"
SET "imovel_id" = NULL
WHERE "imovel_id" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1
    FROM "imoveis"
    WHERE "imoveis"."id" = "contas_pagar"."imovel_id"
      AND "imoveis"."empresa_id" = "contas_pagar"."empresa_id"
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'contas_pagar_imovel_id_fkey'
  ) THEN
    ALTER TABLE "contas_pagar"
      ADD CONSTRAINT "contas_pagar_imovel_id_fkey"
      FOREIGN KEY ("imovel_id")
      REFERENCES "imoveis"("id")
      ON DELETE SET NULL
      ON UPDATE CASCADE;
  END IF;
END $$;
