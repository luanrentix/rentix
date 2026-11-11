CREATE TABLE IF NOT EXISTS public.vendas_reservas_numeracao (
  empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  usuario_id TEXT NOT NULL REFERENCES public.usuarios(id) ON DELETE CASCADE,
  numero INTEGER NOT NULL UNIQUE,
  expira_em TIMESTAMP(3) NOT NULL,
  criado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vendas_reservas_numeracao_pkey PRIMARY KEY (empresa_id, usuario_id)
);

CREATE INDEX IF NOT EXISTS vendas_reservas_numeracao_expira_em_idx
  ON public.vendas_reservas_numeracao(expira_em);

SELECT setval(
  pg_get_serial_sequence('public.vendas_pedidos', 'numero'),
  GREATEST(COALESCE((SELECT MAX(numero) FROM public.vendas_pedidos), 0),
    COALESCE((SELECT last_value FROM public.vendas_pedidos_numero_seq), 0)),
  true
);

ALTER TABLE public.vendas_reservas_numeracao ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vendas_reservas_numeracao FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.vendas_reservas_numeracao FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.vendas_reservas_numeracao FROM authenticated;
  END IF;
END $$;
