DO $$
DECLARE
  table_name text;
  has_anon_role boolean;
  has_authenticated_role boolean;
  protected_tables text[] := ARRAY[
    'contas_bancarias',
    'movimentacoes_bancarias',
    'chamados_suporte',
    'impressos_compartilhados',
    'arquivos_sistema',
    'assinaturas_contrato',
    'error'
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
END $$;
