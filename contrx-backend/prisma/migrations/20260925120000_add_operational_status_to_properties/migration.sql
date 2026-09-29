ALTER TABLE imoveis
ADD COLUMN IF NOT EXISTS status_operacional TEXT NOT NULL DEFAULT 'AVAILABLE';

UPDATE imoveis
SET status_operacional = 'RENTED'
WHERE id IN (
  SELECT DISTINCT imovel_id
  FROM contratos
  WHERE status = 'ATIVO' AND excluido_em IS NULL
);

UPDATE imoveis
SET status_operacional = 'INACTIVE'
WHERE ativo = false;
