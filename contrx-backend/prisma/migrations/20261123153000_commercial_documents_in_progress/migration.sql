UPDATE public.vendas_pedidos
SET status = 'EM_ANDAMENTO', concluido_em = NULL
WHERE tipo_venda IN ('ORCAMENTO', 'CONDICIONAL', 'PEDIDO')
  AND status = 'CONCLUIDA';
