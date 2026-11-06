BEGIN;
ALTER TABLE public.vendas_produtos
  ADD COLUMN permite_desconto BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN permite_acrescimo BOOLEAN NOT NULL DEFAULT true;
CREATE TABLE public.vendas_produtos_historico_precos (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  empresa_id TEXT NOT NULL,
  produto_id TEXT NOT NULL,
  usuario_id TEXT,
  usuario_nome TEXT,
  valores_anteriores JSONB,
  valores_atuais JSONB NOT NULL,
  criado_em TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (produto_id, empresa_id) REFERENCES public.vendas_produtos(id, empresa_id) ON DELETE CASCADE
);
CREATE INDEX vendas_precos_empresa_produto_data_idx
ON public.vendas_produtos_historico_precos(empresa_id, produto_id, criado_em);
ALTER TABLE public.vendas_produtos_historico_precos ENABLE ROW LEVEL SECURITY;

CREATE FUNCTION public.registrar_historico_preco_produto() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE anterior JSONB; atual JSONB; autor TEXT; nome_autor TEXT;
BEGIN
  atual := jsonb_build_object('price', NEW.preco, 'purchaseCost', NEW.custo_compra,
    'additionalCost', NEW.custo_adicional, 'markupMultiplier', NEW.markup_multiplicador,
    'promotionalPrice', NEW.preco_promocional);
  IF TG_OP = 'UPDATE' THEN
    anterior := jsonb_build_object('price', OLD.preco, 'purchaseCost', OLD.custo_compra,
      'additionalCost', OLD.custo_adicional, 'markupMultiplier', OLD.markup_multiplicador,
      'promotionalPrice', OLD.preco_promocional);
    IF anterior = atual THEN RETURN NEW; END IF;
  END IF;
  autor := nullif(current_setting('contrx.price_actor_id', true), '');
  SELECT nome INTO nome_autor FROM public.usuarios WHERE id = autor AND empresa_id = NEW.empresa_id;
  INSERT INTO public.vendas_produtos_historico_precos(empresa_id, produto_id, usuario_id, usuario_nome, valores_anteriores, valores_atuais)
  VALUES (NEW.empresa_id, NEW.id, CASE WHEN nome_autor IS NULL THEN NULL ELSE autor END, nome_autor, anterior, atual);
  RETURN NEW;
END;
$$;
CREATE TRIGGER vendas_produtos_historico_precos
AFTER INSERT OR UPDATE OF preco, custo_compra, custo_adicional, markup_multiplicador, preco_promocional
ON public.vendas_produtos FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_preco_produto();
COMMIT;
