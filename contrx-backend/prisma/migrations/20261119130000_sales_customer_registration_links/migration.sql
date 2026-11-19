BEGIN;

CREATE TABLE public.vendas_links_cadastro_cliente (
  id TEXT NOT NULL,
  token_hash TEXT NOT NULL,
  empresa_id TEXT NOT NULL,
  cliente_criado_id TEXT,
  expira_em TIMESTAMP(3) NOT NULL,
  usado_em TIMESTAMP(3),
  consentido_em TIMESTAMP(3),
  criado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT vendas_links_cadastro_cliente_pkey PRIMARY KEY (id),
  CONSTRAINT vendas_links_cadastro_cliente_empresa_fkey
    FOREIGN KEY (empresa_id) REFERENCES public.empresas(id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT vendas_links_cadastro_cliente_cliente_fkey
    FOREIGN KEY (cliente_criado_id) REFERENCES public.vendas_clientes(id)
    ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE UNIQUE INDEX vendas_links_cadastro_cliente_token_hash_key
  ON public.vendas_links_cadastro_cliente(token_hash);
CREATE UNIQUE INDEX vendas_links_cadastro_cliente_cliente_criado_key
  ON public.vendas_links_cadastro_cliente(cliente_criado_id);
CREATE INDEX vendas_links_cadastro_cliente_empresa_expira_idx
  ON public.vendas_links_cadastro_cliente(empresa_id, expira_em);

ALTER TABLE public.vendas_links_cadastro_cliente ENABLE ROW LEVEL SECURITY;
DO $$
DECLARE client_role TEXT;
BEGIN
  FOR client_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon', 'authenticated')
  LOOP
    EXECUTE format(
      'REVOKE ALL PRIVILEGES ON TABLE public.vendas_links_cadastro_cliente FROM %I',
      client_role
    );
  END LOOP;
END
$$;

COMMIT;
