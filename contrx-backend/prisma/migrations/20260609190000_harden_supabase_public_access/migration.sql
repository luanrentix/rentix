DO $$
DECLARE
  table_name text;
  has_anon_role boolean;
  has_authenticated_role boolean;
  protected_tables text[] := ARRAY[
    'agenda_itens',
    'configuracoes_app',
    'contas_pagar',
    'contas_receber',
    'contratos',
    'empresas',
    'historico_comercial',
    'imoveis',
    'movimentacoes_imoveis',
    'pagamentos_realizados',
    'pagamentos_recebidos',
    'pessoas',
    'usuarios'
  ];
BEGIN
  SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = 'anon') INTO has_anon_role;
  SELECT EXISTS(SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') INTO has_authenticated_role;

  FOREACH table_name IN ARRAY protected_tables LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);

      IF has_anon_role THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon', table_name);
      END IF;

      IF has_authenticated_role THEN
        EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated', table_name);
      END IF;
    END IF;
  END LOOP;

  IF has_anon_role THEN
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM anon;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM anon;
  END IF;

  IF has_authenticated_role THEN
    REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM authenticated;
    REVOKE ALL ON ALL FUNCTIONS IN SCHEMA public FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM authenticated;
    ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON FUNCTIONS FROM authenticated;
  END IF;
END $$;
