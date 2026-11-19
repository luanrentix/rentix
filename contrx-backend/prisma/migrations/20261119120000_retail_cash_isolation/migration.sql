-- Separação não destrutiva do caixa interno do varejo e das contas bancárias.
ALTER TABLE "contas_bancarias"
ADD COLUMN "caixa_varejo" BOOLEAN NOT NULL DEFAULT false;

UPDATE "contas_bancarias"
SET "nome" = 'CAIXA GERAL', "caixa_varejo" = true
WHERE "nome" = 'VENDAS - PADRAO AUTOMATICO' AND "tipo" = 'CASH';

-- Caixas auxiliares criados pelo módulo de varejo também ficam isolados.
UPDATE "contas_bancarias" AS account
SET "caixa_varejo" = true
WHERE account."nome" = 'CAIXA LOJA' AND account."tipo" = 'CASH'
AND EXISTS (
  SELECT 1 FROM "movimentacoes_bancarias" AS movement
  WHERE movement."conta_bancaria_id" = account."id"
    AND movement."tipo_referencia" = 'CASH_OPERATION'
);
