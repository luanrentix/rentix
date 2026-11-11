# Modelo de impressão de condicional

## Revisão: cliente, promoção e descontos

Peso e total de peso foram removidos. A tabela apresenta preço original, preço de venda/promoção, desconto efetivo por linha e total final. O desconto geral é rateado em centavos entre linhas elegíveis, excluindo promoção e bloqueio do cadastro; acréscimos também são rateados. Os totais incluem ajustes históricos por unidade sem aplicá-los duas vezes.

O modal consulta novamente os dados do cliente ao abrir, mesmo quando o documento vinha com cliente nulo/incompleto. A API retorna nome, endereço, dois telefones e e-mail dentro da empresa autenticada. Se o cadastro não possui endereço/contato, o impresso informa que o campo não está cadastrado. Prévia atual: `output/pdf/condicional-atualizado.pdf`, com promoção e desconto demonstrados.

O impresso de `CONDICIONAL` utiliza um layout A4 próprio inspirado no PDF fornecido: loja e data de impressão, cliente/endereço/telefone, número/data/vendedor, tabela com referência, código de barras, produto, unidade, quantidade, valor unitário, desconto, total e peso; encerramento com totais, observações, condições e assinatura do cliente.

O texto de prazo de 24 horas foi reproduzido como condição impressa. Não existe conversão automática em venda, cobrança ou alteração de prazo no banco por causa desse texto. O documento não comprova recebimento. Peso e dados históricos ausentes usam traço; nenhum peso ou código de barras é inventado.

Novos itens preservam o código de barras da variação/produto no JSON já existente. Documentos antigos não recebem dados atuais do catálogo no lugar de seus dados históricos. O endereço do cliente é consultado na empresa autenticada, como já ocorria para orçamentos. A prévia carrega esses dados antes de habilitar a impressão.

Prévia fictícia: `output/pdf/condicional-modelo-final.pdf`. Validação visual em uma página e cenário longo de 100 linhas. Cabeçalho da tabela se repete nas páginas; o encerramento fica agrupado para evitar rodapé isolado.

Validações: roteiros de comprovantes, orçamento e condicional; TypeScript e lint dos arquivos alterados; 66 testes do serviço de vendas, mais os dois cenários de endereço parametrizados; build do backend. Nenhum commit, push ou deploy executado.
