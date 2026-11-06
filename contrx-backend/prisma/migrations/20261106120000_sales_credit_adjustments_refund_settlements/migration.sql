BEGIN;
CREATE TABLE "vendas_ajustes_credito" (
  "id" TEXT PRIMARY KEY, "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "cliente_id" TEXT NOT NULL REFERENCES "vendas_clientes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "venda_id" TEXT REFERENCES "vendas_pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "valor" DECIMAL(10,2) NOT NULL CHECK ("valor" <> 0),
  "motivo" TEXT NOT NULL, "usuario_id" TEXT NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "requisicao_id" TEXT NOT NULL, "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "vendas_ajustes_credito_empresa_id_requisicao_id_key" ON "vendas_ajustes_credito"("empresa_id", "requisicao_id");
CREATE INDEX "vendas_ajustes_credito_empresa_id_cliente_id_criado_em_idx" ON "vendas_ajustes_credito"("empresa_id", "cliente_id", "criado_em");
CREATE TABLE "vendas_reembolsos" (
  "id" TEXT PRIMARY KEY, "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "venda_id" TEXT NOT NULL REFERENCES "vendas_pedidos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "transacao_id" TEXT NOT NULL REFERENCES "movimentacoes_bancarias"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "valor" DECIMAL(10,2) NOT NULL CHECK ("valor" > 0),
  "valor_liquidado" DECIMAL(10,2) NOT NULL DEFAULT 0 CHECK ("valor_liquidado" >= 0 AND "valor_liquidado" <= "valor"),
  "usuario_id" TEXT REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "motivo" TEXT NOT NULL,
  "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "vendas_reembolsos_transacao_id_key" ON "vendas_reembolsos"("transacao_id");
CREATE INDEX "vendas_reembolsos_empresa_id_venda_id_idx" ON "vendas_reembolsos"("empresa_id", "venda_id");
CREATE TABLE "vendas_liquidacoes_reembolso" (
  "id" TEXT PRIMARY KEY, "empresa_id" TEXT NOT NULL REFERENCES "empresas"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "reembolso_id" TEXT NOT NULL REFERENCES "vendas_reembolsos"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  "valor" DECIMAL(10,2) NOT NULL CHECK ("valor" > 0), "destino" TEXT NOT NULL CHECK ("destino" IN ('REFUND', 'CREDIT')),
  "usuario_id" TEXT NOT NULL REFERENCES "usuarios"("id") ON DELETE RESTRICT ON UPDATE CASCADE, "motivo" TEXT NOT NULL,
  "requisicao_id" TEXT NOT NULL, "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX "vendas_liquidacoes_reembolso_empresa_id_requisicao_id_key" ON "vendas_liquidacoes_reembolso"("empresa_id", "requisicao_id");
CREATE INDEX "vendas_liquidacoes_reembolso_empresa_id_reembolso_id_idx" ON "vendas_liquidacoes_reembolso"("empresa_id", "reembolso_id");
ALTER TABLE "vendas_ajustes_credito" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendas_reembolsos" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "vendas_liquidacoes_reembolso" ENABLE ROW LEVEL SECURITY;
COMMIT;
