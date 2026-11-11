CREATE TABLE IF NOT EXISTS public.vendas_modelo_composicao_preco (
  empresa_id TEXT PRIMARY KEY REFERENCES public.empresas(id) ON DELETE CASCADE,
  modelo JSONB NOT NULL,
  atualizado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE public.vendas_modelo_composicao_preco ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.vendas_modelo_composicao_preco FROM PUBLIC;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    REVOKE ALL ON public.vendas_modelo_composicao_preco FROM anon;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    REVOKE ALL ON public.vendas_modelo_composicao_preco FROM authenticated;
  END IF;
END $$;
