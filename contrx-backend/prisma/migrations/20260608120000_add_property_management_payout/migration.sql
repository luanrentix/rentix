ALTER TABLE "imoveis"
ADD COLUMN IF NOT EXISTS "modo_gestao" TEXT NOT NULL DEFAULT 'OWNED',
ADD COLUMN IF NOT EXISTS "taxa_administracao_percentual" DECIMAL(5, 2),
ADD COLUMN IF NOT EXISTS "dia_repasse_proprietario" INTEGER,
ADD COLUMN IF NOT EXISTS "gerar_repasse_proprietario" BOOLEAN NOT NULL DEFAULT true;

ALTER TABLE "imoveis"
ADD CONSTRAINT "imoveis_taxa_administracao_percentual_check"
CHECK (
  "taxa_administracao_percentual" IS NULL
  OR (
    "taxa_administracao_percentual" >= 0
    AND "taxa_administracao_percentual" <= 100
  )
);

ALTER TABLE "imoveis"
ADD CONSTRAINT "imoveis_dia_repasse_proprietario_check"
CHECK (
  "dia_repasse_proprietario" IS NULL
  OR (
    "dia_repasse_proprietario" >= 1
    AND "dia_repasse_proprietario" <= 31
  )
);
