ALTER TABLE "imoveis"
ADD COLUMN IF NOT EXISTS "categoria_ativo" TEXT,
ADD COLUMN IF NOT EXISTS "marca" TEXT,
ADD COLUMN IF NOT EXISTS "modelo" TEXT,
ADD COLUMN IF NOT EXISTS "numero_serie" TEXT,
ADD COLUMN IF NOT EXISTS "ano_fabricacao" INTEGER,
ADD COLUMN IF NOT EXISTS "condicao" TEXT,
ADD COLUMN IF NOT EXISTS "codigo_patrimonial" TEXT;

UPDATE "imoveis"
SET "categoria_ativo" = 'PROPERTY'
WHERE "categoria_ativo" IS NULL;
