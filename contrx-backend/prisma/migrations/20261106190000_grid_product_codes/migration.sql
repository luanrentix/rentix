BEGIN;
LOCK TABLE public.vendas_produtos IN ACCESS EXCLUSIVE MODE;

-- Valida o resultado completo antes de atualizar qualquer codigo.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM public.vendas_produtos child
    JOIN public.vendas_produtos parent ON parent.id = child.produto_grade_id AND parent.empresa_id = child.empresa_id
    WHERE nullif(btrim(parent.codigo), '') IS NULL OR nullif(btrim(child.valor_grade), '') IS NULL
      OR length(btrim(parent.codigo) || '-' || upper(btrim(child.valor_grade))) > 40
  ) THEN RAISE EXCEPTION 'Matriz ou opcao sem codigo valido de ate 40 caracteres.'; END IF;
  IF EXISTS (
    SELECT empresa_id, novo_codigo FROM (
      SELECT child.empresa_id, CASE WHEN parent.id IS NULL THEN child.codigo
        ELSE btrim(parent.codigo) || '-' || upper(btrim(child.valor_grade)) END AS novo_codigo
      FROM public.vendas_produtos child LEFT JOIN public.vendas_produtos parent
        ON parent.id = child.produto_grade_id AND parent.empresa_id = child.empresa_id
    ) proposed WHERE novo_codigo IS NOT NULL
    GROUP BY empresa_id, novo_codigo HAVING count(*) > 1
  ) THEN RAISE EXCEPTION 'Codigos de grade duplicados. Migracao cancelada sem alterar dados.'; END IF;
END;
$$;

-- Faixa temporaria evita conflitos com codigos antigos durante a conversao.
UPDATE public.vendas_produtos SET codigo = '__GRID_MIGRATION__' || id WHERE produto_grade_id IS NOT NULL;
UPDATE public.vendas_produtos child
SET codigo = btrim(parent.codigo) || '-' || upper(btrim(child.valor_grade))
FROM public.vendas_produtos parent
WHERE parent.id = child.produto_grade_id AND parent.empresa_id = child.empresa_id;

CREATE FUNCTION public.definir_codigo_produto_grade() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE codigo_pai TEXT;
BEGIN
  IF NEW.produto_grade_id IS NOT NULL THEN
    SELECT codigo INTO codigo_pai FROM public.vendas_produtos WHERE id = NEW.produto_grade_id AND empresa_id = NEW.empresa_id;
    IF nullif(btrim(codigo_pai), '') IS NULL OR nullif(btrim(NEW.valor_grade), '') IS NULL THEN
      RAISE EXCEPTION 'Matriz e opcao da grade devem possuir codigo e identificacao.';
    END IF;
    NEW.codigo := btrim(codigo_pai) || '-' || upper(btrim(NEW.valor_grade));
    IF length(NEW.codigo) > 40 THEN RAISE EXCEPTION 'Codigo da grade deve ter ate 40 caracteres.'; END IF;
  END IF;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vendas_produtos_codigo_grade
BEFORE INSERT OR UPDATE OF codigo, produto_grade_id, valor_grade, empresa_id ON public.vendas_produtos
FOR EACH ROW EXECUTE FUNCTION public.definir_codigo_produto_grade();

CREATE FUNCTION public.atualizar_codigos_filhos_grade() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
BEGIN
  UPDATE public.vendas_produtos SET codigo = btrim(NEW.codigo) || '-' || upper(btrim(valor_grade))
  WHERE produto_grade_id = NEW.id AND empresa_id = NEW.empresa_id;
  RETURN NEW;
END;
$$;
CREATE TRIGGER vendas_produtos_atualizar_codigos_grade
AFTER UPDATE OF codigo ON public.vendas_produtos
FOR EACH ROW WHEN (OLD.codigo IS DISTINCT FROM NEW.codigo)
EXECUTE FUNCTION public.atualizar_codigos_filhos_grade();
COMMIT;
