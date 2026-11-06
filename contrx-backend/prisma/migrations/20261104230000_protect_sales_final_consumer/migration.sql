ALTER TABLE "vendas_clientes"
ADD COLUMN "sistema" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "chave_sistema" TEXT;

CREATE UNIQUE INDEX "vendas_clientes_empresa_id_chave_sistema_key"
ON "vendas_clientes"("empresa_id", "chave_sistema");

INSERT INTO "vendas_clientes" (
  "id", "empresa_id", "tipo_pessoa", "nome", "crediario_bloqueado", "ativo", "sistema", "chave_sistema", "criado_em", "atualizado_em"
)
SELECT gen_random_uuid()::text, empresa."id", 'INDIVIDUAL', 'CONSUMIDOR FINAL', false, true, true, 'CONSUMIDOR_FINAL', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
FROM "empresas" empresa
WHERE NOT EXISTS (
  SELECT 1 FROM "vendas_clientes" cliente
  WHERE cliente."empresa_id" = empresa."id" AND cliente."sistema" = true
);
