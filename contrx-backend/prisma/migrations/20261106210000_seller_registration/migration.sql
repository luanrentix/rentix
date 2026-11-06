BEGIN;
ALTER TABLE public.vendas_vendedores
  ADD COLUMN tipo_pessoa TEXT NOT NULL DEFAULT 'INDIVIDUAL',
  ADD COLUMN nome_fantasia TEXT, ADD COLUMN identidade TEXT,
  ADD COLUMN orgao_emissor TEXT, ADD COLUMN data_nascimento TEXT,
  ADD COLUMN sexo TEXT, ADD COLUMN telefone_secundario TEXT,
  ADD COLUMN cep TEXT, ADD COLUMN endereco TEXT, ADD COLUMN numero TEXT,
  ADD COLUMN complemento TEXT, ADD COLUMN bairro TEXT, ADD COLUMN cidade TEXT,
  ADD COLUMN uf TEXT, ADD COLUMN observacoes TEXT;
UPDATE public.vendas_vendedores SET tipo_pessoa='COMPANY' WHERE length(cpf)=14;
ALTER TABLE public.vendas_vendedores ADD CONSTRAINT vendas_vendedores_tipo_pessoa_check
CHECK (tipo_pessoa IN ('INDIVIDUAL','COMPANY'));
-- A coluna cpf e seu indice unico por empresa continuam preservados e passam a aceitar CPF ou CNPJ.
COMMIT;
