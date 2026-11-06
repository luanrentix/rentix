BEGIN;
LOCK TABLE public.empresas IN ACCESS EXCLUSIVE MODE;

-- Nunca alterar IDs ou seus vinculos para resolver prefixos repetidos.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.empresas WHERE id !~* '^[0-9a-f]{5}') THEN
    RAISE EXCEPTION 'Empresa com ID sem prefixo hexadecimal de cinco caracteres.';
  END IF;
  IF EXISTS (
    SELECT upper(left(id, 5)) FROM public.empresas
    GROUP BY upper(left(id, 5)) HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'Empresas com os mesmos cinco primeiros caracteres do ID. Migracao cancelada sem alterar dados.';
  END IF;
END;
$$;

ALTER TABLE public.empresas ALTER COLUMN codigo_empresa DROP DEFAULT;
-- Evita conflito transitorio entre codigos antigos e os novos durante a conversao.
UPDATE public.empresas SET codigo_empresa = '__CTX_ID_MIGRATION__' || id;
UPDATE public.empresas SET codigo_empresa = 'CTX-' || upper(left(id, 5));

CREATE FUNCTION public.definir_codigo_empresa_por_id() RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = pg_catalog, public
AS $$
BEGIN
  IF NEW.id IS NULL OR NEW.id !~* '^[0-9a-f]{5}' THEN
    RAISE EXCEPTION 'ID da empresa deve iniciar com cinco caracteres hexadecimais.';
  END IF;
  NEW.codigo_empresa := 'CTX-' || upper(left(NEW.id, 5));
  RETURN NEW;
END;
$$;

CREATE TRIGGER empresas_codigo_por_id
BEFORE INSERT OR UPDATE OF id, codigo_empresa ON public.empresas
FOR EACH ROW EXECUTE FUNCTION public.definir_codigo_empresa_por_id();

DROP FUNCTION public.gerar_codigo_empresa();
DROP SEQUENCE public.empresas_codigo_curto_seq;
COMMIT;
