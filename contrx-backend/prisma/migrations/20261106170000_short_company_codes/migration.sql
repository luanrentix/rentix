BEGIN;
-- Impede cadastros concorrentes durante a conversao dos codigos existentes.
LOCK TABLE public.empresas IN ACCESS EXCLUSIVE MODE;

CREATE SEQUENCE public.empresas_codigo_curto_seq
  AS BIGINT MINVALUE 1 MAXVALUE 60466175 NO CYCLE;

-- Base 36: cinco caracteres, de 00001 ate ZZZZZ, sem sorteios ou colisoes.
CREATE FUNCTION public.gerar_codigo_empresa() RETURNS TEXT
LANGUAGE plpgsql VOLATILE
SET search_path = pg_catalog, public
AS $$
DECLARE
  numero BIGINT;
  sufixo TEXT;
  alfabeto CONSTANT TEXT := '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  codigo TEXT;
BEGIN
  LOOP
    numero := nextval('public.empresas_codigo_curto_seq'::regclass);
    sufixo := '';
    FOR posicao IN 1..5 LOOP
      sufixo := substr(alfabeto, (numero % 36)::INTEGER + 1, 1) || sufixo;
      numero := numero / 36;
    END LOOP;
    codigo := 'CTX-' || sufixo;
    -- Preserva eventuais codigos curtos ja cadastrados.
    IF NOT EXISTS (SELECT 1 FROM public.empresas WHERE codigo_empresa = codigo) THEN
      RETURN codigo;
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.empresas ALTER COLUMN codigo_empresa
  SET DEFAULT public.gerar_codigo_empresa();

-- Mantem IDs, usuarios, sessoes e relacionamentos; muda apenas o codigo de login.
DO $$
DECLARE
  empresa RECORD;
BEGIN
  FOR empresa IN
    SELECT id FROM public.empresas
    WHERE codigo_empresa !~ '^CTX-[0-9A-Z]{5}$'
    ORDER BY criado_em, id
  LOOP
    UPDATE public.empresas
    SET codigo_empresa = public.gerar_codigo_empresa()
    WHERE id = empresa.id;
  END LOOP;
END;
$$;
COMMIT;
