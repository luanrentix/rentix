ALTER TABLE "vendas_clientes"
  ADD COLUMN "codigo" SERIAL NOT NULL,
  ADD COLUMN "tipo_pessoa" TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN "apelido_fantasia" TEXT,
  ADD COLUMN "rg" TEXT,
  ADD COLUMN "orgao_expedidor" TEXT,
  ADD COLUMN "data_nascimento" DATE,
  ADD COLUMN "sexo" TEXT,
  ADD COLUMN "telefone_2" TEXT,
  ADD COLUMN "limite_credito" DECIMAL(10,2) NOT NULL DEFAULT 0,
  ADD COLUMN "prazo_crediario" INTEGER,
  ADD COLUMN "crediario_bloqueado" BOOLEAN NOT NULL DEFAULT false;

CREATE UNIQUE INDEX "vendas_clientes_codigo_key" ON "vendas_clientes"("codigo");