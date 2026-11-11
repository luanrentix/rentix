# Vendas: escolha de preços, ajustes por produto e leitura

## Comportamento implementado

- Produtos com promoção válida apresentam uma escolha explícita entre **preço normal** e **preço promocional**, inclusive quando incluídos por código de barras ou pesquisa. Variações com preço independente preservam a regra existente de não herdar a promoção geral do produto.
- A lista separa linhas por produto, variação, modalidade de preço e ajustes. Selecionar o mesmo produto no preço normal e no promocional não mistura os valores.
- Itens promocionais têm fundo verde, selo **PROMOÇÃO**, valor original riscado e indicação **sem desconto adicional**. O comprovante e o orçamento também identificam a promoção.
- Colunas: produto/código, quantidade, valor original, ajuste por unidade, valor com ajuste por unidade, total e remoção.
- Desconto e acréscimo em reais são informados em campos independentes por produto/unidade; editar um preserva o outro, respeitando os bloqueios do cadastro. O subtotal da linha usa o valor final e o arredondamento do servidor. O resumo informa os efeitos efetivos em centavos, inclusive para quantidades fracionadas.
- A promoção bloqueia desconto adicional na interface e na API. Ajustes gerais enviados por clientes antigos só podem atingir os itens normais elegíveis. Acréscimo continua sujeito à autorização do cadastro do produto.
- Registros novos guardam a modalidade selecionada, o preço original, o preço-base e os ajustes dentro do JSON existente dos itens. Rascunho da sessão e reabertura preservam esses dados, sem migration.
- Documentos antigos mantêm seus valores. Ajuste geral histórico aparece explicitamente com opção de remoção; nenhum valor é descartado silenciosamente. Itens sem metadados históricos exigem seleção explícita de preço antes de editar ajustes por item.
- Se o preço cadastrado mudar antes de gravar, a API recusa divergência entre preço-base, ajuste e valor final. O operador deve conferir e selecionar o preço atualizado.

## Layout

O cabeçalho global fica oculto no desktop em `/vendas`. No celular ele permanece para acesso ao menu. A venda usa o mesmo `SalesPageHeader` compacto do cadastro de produtos. Regras CSS antigas sobrepostas foram unificadas: campos de 44 px, tabela de 14 px, cabeçalho de 12 px e controles por item maiores. Pagamentos acompanham a altura do conteúdo, sem rolagem interna que esconda o resumo. Em larguras menores, o pagamento fica abaixo dos itens; em telas amplas permanece à direita. O cadastro de produtos também recebeu tabela de 14 px e mais espaçamento entre linhas.

Foi inspecionada uma renderização estática da tabela real do componente com três cenários: desconto normal, promoção sem desconto e acréscimo. Essa verificação visual não equivale a uma homologação autenticada de todos os eventos do navegador.

## Validação

- Backend: **36 suítes, 306 testes aprovados**, incluindo modalidade normal/promocional, tentativas de desconto via API, variação de preço independente, ajustes unitários, linha normal/promocional no mesmo carrinho e desconto geral legado.
- Roteiros de preços, números, comprovante e orçamento aprovados; regressão de arredondamento do resumo para quantidade fracionada incluída.
- TypeScript do frontend, lint dos arquivos de implementação e builds locais verificados. Avisos anteriores de imports/estados do shell não foram tratados como defeitos desta alteração.
- Fluxo integrado com banco local executado em transação com rollback.

O novo modelo de orçamento está documentado separadamente em `modelo-orcamento-2026-11-09.md`, com prévia fictícia em `output/pdf/orcamento-modelo-final.pdf`.

Nenhum commit, push ou deploy executado. Atualizar frontend e backend juntos pelo procedimento manual para disponibilizar esses recursos em produção.


## Revisão do desconto no total

Por solicitação posterior, os campos por item foram retirados. Desconto e acréscimo agora são informados no resumo sobre o total. O grid apresenta totais de linha: valor original, desconto e valor final. O rateio proporcional usa centavos e maior resto para fechar a soma, excluindo promocionais e bloqueados do desconto. Os valores rateados são somente demonstrativos: a API recebe o ajuste geral uma vez, evitando desconto duplicado. Ajustes históricos dos itens são preservados.

O resumo voltou ao formato anterior: linhas Desconto e Acréscimo com campos R$ e % lado a lado. O percentual usa o subtotal da venda e converte para um valor fixo em reais; os campos permanecem sincronizados. As regras de elegibilidade e o rateio demonstrativo do grid permanecem.
