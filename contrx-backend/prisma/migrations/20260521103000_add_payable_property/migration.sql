ALTER TABLE "contas_pagar" ADD COLUMN "imovel_id" TEXT;

CREATE INDEX "contas_pagar_imovel_id_idx" ON "contas_pagar"("imovel_id");

ALTER TABLE "contas_pagar" ADD CONSTRAINT "contas_pagar_imovel_id_fkey" FOREIGN KEY ("imovel_id") REFERENCES "imoveis"("id") ON DELETE SET NULL ON UPDATE CASCADE;
