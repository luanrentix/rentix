BEGIN;
-- Vendas e condicionais podem ultrapassar o estoque físico.
-- A reserva continua não negativa e é liberada ao converter/cancelar.
ALTER TABLE "vendas_produtos"
  DROP CONSTRAINT IF EXISTS "vendas_produtos_reserva_valida_check";
ALTER TABLE "vendas_produtos"
  ADD CONSTRAINT "vendas_produtos_reserva_valida_check"
  CHECK ("estoque_reservado" >= 0) NOT VALID;

ALTER TABLE "vendas_variacoes_produtos"
  DROP CONSTRAINT IF EXISTS "vendas_variacoes_reserva_check";
ALTER TABLE "vendas_variacoes_produtos"
  ADD CONSTRAINT "vendas_variacoes_reserva_check"
  CHECK ("estoque_reservado" >= 0) NOT VALID;
COMMIT;
