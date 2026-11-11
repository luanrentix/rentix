# Modelo de impressão de orçamento

Referência fornecida pelo usuário: `C:\Users\MacOS\Desktop\ORÇAMENTO.pdf`, uma página A4. O documento foi tratado como referência visual, sem importar os dados comerciais do exemplo para os cadastros.

O modelo é utilizado em **Vendas → Abrir → Orçamentos → Comprovante/Imprimir**, e na impressão apresentada após gravar um orçamento. Outros tipos de comprovante mantêm seu modelo.

## Estrutura

- Cabeçalho com logotipo cadastrado, empresa, CNPJ/CPF, inscrição estadual, endereço e telefone.
- Número do orçamento e aviso de documento sem valor fiscal.
- Data, validade, cliente, endereço, telefone, entrega e vendedor.
- Tabela com quantidade, código, produto/marca, valor unitário e total. Quantidades admitem até três casas.
- Subtotal, desconto/acréscimo em percentual e valor, e total à direita.
- Observações, aviso fiscal e rodapé sem comprovação de recebimento.
- A4 com margens de 8 mm e margem inferior de 14 mm, repetição do cabeçalho da tabela e proteção contra quebra de uma linha entre páginas.

A validade e o endereço de entrega são opções **somente desta impressão**. Não há prazo presumido de 15 dias, gravação desses campos no orçamento ou alteração da regra comercial. Peso bruto/líquido permanecem sem valor porque não há registro de peso no módulo. Também não foram copiadas regras do exemplo sobre promoção ou estoque: o sistema mantém suas validações existentes.

O endereço do cliente é consultado no cadastro atual, restrito à empresa autenticada, inclusive para cadastro inativo vinculado ao documento. A marca passa a compor os itens dos novos documentos; documentos antigos sem marca não recebem dados históricos inventados. Não houve migration.

## Validação

- Roteiros `validate-sales-receipt-local.cjs` e `validate-sales-quote-local.cjs`: aprovados, incluindo escaping de texto e bloqueio de URL de logotipo executável.
- TypeScript e ESLint dos arquivos de implementação alterados: aprovados.
- Testes do serviço de Vendas e build do backend aprovados.
- Prévia de uma página e teste com 95 itens em quatro páginas gerados pelo Chromium e renderizados com o componente PDF do Windows. Inspeção em alta resolução para evitar artefatos do renderizador em baixa resolução.
- Prévia com dados fictícios em `output/pdf/orcamento-modelo-final.pdf`.

Nenhum commit, push ou deploy executado. Para produção, atualizar frontend e backend pelo procedimento manual habitual.
