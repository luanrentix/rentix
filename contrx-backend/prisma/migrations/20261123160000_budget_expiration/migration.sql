ALTER TABLE public.vendas_pedidos ADD COLUMN expira_em TIMESTAMPTZ;
CREATE INDEX vendas_pedidos_orcamentos_expira_em_idx
  ON public.vendas_pedidos(empresa_id, tipo_venda, status, expira_em)
  WHERE tipo_venda = 'ORCAMENTO' AND status = 'EM_ANDAMENTO';
