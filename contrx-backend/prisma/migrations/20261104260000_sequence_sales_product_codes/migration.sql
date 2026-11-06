WITH ranked_products AS (
  SELECT
    "id",
    ROW_NUMBER() OVER (
      PARTITION BY "empresa_id"
      ORDER BY "criado_em", "id"
    )::text AS "codigo_sequencial"
  FROM "vendas_produtos"
)
UPDATE "vendas_produtos" AS product
SET "codigo" = ranked_products."codigo_sequencial"
FROM ranked_products
WHERE product."id" = ranked_products."id";

CREATE UNIQUE INDEX "vendas_produtos_empresa_id_codigo_key"
  ON "vendas_produtos"("empresa_id", "codigo");
