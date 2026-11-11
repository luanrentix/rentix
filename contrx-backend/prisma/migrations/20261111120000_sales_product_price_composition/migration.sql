BEGIN;

ALTER TABLE public.vendas_produtos
  ADD COLUMN IF NOT EXISTS composicao_preco JSONB;

CREATE OR REPLACE FUNCTION public.registrar_historico_preco_produto() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE anterior JSONB; atual JSONB; autor TEXT; nome_autor TEXT; origem TEXT;
BEGIN
  origem := COALESCE(
    NULLIF(current_setting('contrx.price_origin', true), ''),
    'CADASTRO_PRODUTO'
  );
  atual := jsonb_build_object(
    'price', NEW.preco,
    'purchaseCost', NEW.custo_compra,
    'additionalCost', NEW.custo_adicional,
    'markupMultiplier', NEW.markup_multiplicador,
    'promotionalPrice', NEW.preco_promocional,
    'marginPercent', CASE WHEN NEW.preco > 0
      THEN round(((NEW.preco - NEW.custo_compra - NEW.custo_adicional) / NEW.preco) * 100, 2)
      ELSE 0 END,
    'priceComposition', NEW.composicao_preco,
    'origin', origem
  );
  IF TG_OP = 'UPDATE' THEN
    anterior := jsonb_build_object(
      'price', OLD.preco,
      'purchaseCost', OLD.custo_compra,
      'additionalCost', OLD.custo_adicional,
      'markupMultiplier', OLD.markup_multiplicador,
      'promotionalPrice', OLD.preco_promocional,
      'marginPercent', CASE WHEN OLD.preco > 0
        THEN round(((OLD.preco - OLD.custo_compra - OLD.custo_adicional) / OLD.preco) * 100, 2)
        ELSE 0 END,
      'priceComposition', OLD.composicao_preco
    );
    IF anterior = atual - 'origin' THEN RETURN NEW; END IF;
  END IF;
  autor := NULLIF(current_setting('contrx.price_actor_id', true), '');
  SELECT nome INTO nome_autor FROM public.usuarios
    WHERE id = autor AND empresa_id = NEW.empresa_id;
  INSERT INTO public.vendas_produtos_historico_precos(
    empresa_id, produto_id, usuario_id, usuario_nome,
    valores_anteriores, valores_atuais
  ) VALUES (
    NEW.empresa_id, NEW.id,
    CASE WHEN nome_autor IS NULL THEN NULL ELSE autor END,
    nome_autor, anterior, atual
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS vendas_produtos_historico_precos ON public.vendas_produtos;
CREATE TRIGGER vendas_produtos_historico_precos
AFTER INSERT OR UPDATE OF preco, custo_compra, custo_adicional,
  markup_multiplicador, preco_promocional, composicao_preco
ON public.vendas_produtos
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_preco_produto();

COMMIT;
