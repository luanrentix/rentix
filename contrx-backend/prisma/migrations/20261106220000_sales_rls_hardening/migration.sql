-- NestJS is the application gateway. No client-side Supabase role needs direct sales-table access.
DO $$
DECLARE target text; client_role text;
BEGIN
  FOR target IN
    SELECT tablename FROM pg_tables WHERE schemaname='public' AND tablename LIKE 'vendas\_%' ESCAPE '\'
  LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', target);
    FOR client_role IN SELECT rolname FROM pg_roles WHERE rolname IN ('anon','authenticated')
    LOOP
      EXECUTE format('REVOKE ALL PRIVILEGES ON TABLE public.%I FROM %I', target, client_role);
    END LOOP;
  END LOOP;
END
$$;
