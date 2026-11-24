CREATE TABLE public.vendas_produtos_historico (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  empresa_id TEXT NOT NULL REFERENCES public.empresas(id) ON DELETE CASCADE,
  produto_id TEXT NOT NULL REFERENCES public.vendas_produtos(id) ON DELETE CASCADE,
  usuario_id TEXT,
  usuario_nome TEXT,
  tipo TEXT NOT NULL,
  valores_anteriores JSONB,
  valores_atuais JSONB,
  criado_em TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX vendas_produtos_historico_empresa_produto_data_idx
  ON public.vendas_produtos_historico(empresa_id, produto_id, criado_em DESC);
ALTER TABLE public.vendas_produtos_historico ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.registrar_historico_produto() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = pg_catalog, public AS $$
DECLARE produto TEXT; empresa TEXT; autor TEXT; nome_autor TEXT; tipo_evento TEXT;
BEGIN
  IF TG_TABLE_NAME = 'vendas_variacoes_produtos' THEN
    produto := COALESCE(NEW.produto_id, OLD.produto_id);
    empresa := COALESCE(NEW.empresa_id, OLD.empresa_id);
    tipo_evento := CASE TG_OP WHEN 'INSERT' THEN 'VARIAÇÃO CRIADA' WHEN 'UPDATE' THEN 'VARIAÇÃO ALTERADA' ELSE 'VARIAÇÃO REMOVIDA' END;
  ELSE
    produto := COALESCE(NEW.id, OLD.id);
    empresa := COALESCE(NEW.empresa_id, OLD.empresa_id);
    tipo_evento := CASE TG_OP WHEN 'INSERT' THEN 'PRODUTO CRIADO' WHEN 'UPDATE' THEN 'CADASTRO ALTERADO' ELSE 'PRODUTO REMOVIDO' END;
  END IF;
  autor := NULLIF(current_setting('contrx.product_actor_id', true), '');
  SELECT nome INTO nome_autor FROM public.usuarios WHERE id = autor AND empresa_id = empresa;
  INSERT INTO public.vendas_produtos_historico(empresa_id, produto_id, usuario_id, usuario_nome, tipo, valores_anteriores, valores_atuais)
  VALUES (empresa, produto, CASE WHEN nome_autor IS NULL THEN NULL ELSE autor END, nome_autor, tipo_evento,
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END);
  RETURN COALESCE(NEW, OLD);
END;
$$;
CREATE TRIGGER vendas_produtos_historico_auditoria
AFTER INSERT OR UPDATE OR DELETE ON public.vendas_produtos
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_produto();
CREATE TRIGGER vendas_variacoes_produtos_historico_auditoria
AFTER INSERT OR UPDATE OR DELETE ON public.vendas_variacoes_produtos
FOR EACH ROW EXECUTE FUNCTION public.registrar_historico_produto();
