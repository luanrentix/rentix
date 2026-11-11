# Central de relatórios — entrega e validação

## Acesso e funcionamento

Acesse **Vendas → Relatórios**, em `/vendas?view=RELATORIOS`, na configuração **Varejo** (valor interno `CONFECCOES`). A central está incorporada ao painel desse menu, com 36 consultas divididas em Vendas, Estoque, Financeiros, Gerenciais e Operacionais. O catálogo respeita as permissões de cada usuário. Não há página independente `/relatorios` nem atalhos entre esta central e o financeiro geral.

Os relatórios existentes de vendas, caixa e controladoria continuam disponíveis. Os novos demonstrativos bancários usam somente transações bancárias confirmadas; os de carteira usam títulos e pagamentos; os comerciais usam documentos de venda. Essas bases não são somadas entre si.

## Fases e arquivos

| Fase | Entrega | Arquivos principais |
|---|---|---|
| 1 — Central | Catálogo, filtros pertinentes, paginação de 50 linhas, mensagens sem dados, metadados e totalizadores | `app/vendas/central-relatorios.tsx`, `services/management-reports.ts`, `management-report.catalog.ts`, `management-report.dto.ts` |
| 2 — Comercial | Vendedores, detalhamento por item, período, cliente, produtos líquidos de devoluções, Top e ABC por receita/quantidade, modalidades mistas, cancelados/estornados com eventos | `management-report.service.ts`, `management-report.controller.ts` |
| 3 — Estoque | Posição, mínimos, negativos, valor cadastral, movimentos, inatividade e balanço reconstruído | `management-report.service.ts` |
| 4 — Financeiro | Títulos/saldos, aging por cliente, recebimentos/pagamentos, despesas pagas por categoria, balancete bancário, fluxo realizado e projeção de compromissos abertos | `management-report.service.ts` |
| 5 — Gerencial | Resumo comercial, desempenho mensal de vendedores, evolução, comparação com período imediatamente anterior, indicadores bancários e composição de DRE parcial | `management-report.service.ts`, `app/vendas/central-relatorios.tsx` |
| 6 — Exportação | Prévia completa, impressão/PDF pelo navegador e XLSX com números calculáveis, metadados e observações | `services/sales-report.ts`, `services/management-reports.ts`, `app/vendas/cash-report-modal.tsx` |
| 7 — Validação local | Testes de cálculo, consulta, autorização, volume e exportação; builds | `management-report.service.spec.ts`, `scripts/test-management-report-export.cjs` |

Os arquivos `management-report.*` ficam em `contrx-backend/src/vendas/`. O registro ocorre em `vendas.module.ts`. `app/vendas/page.tsx` incorpora a central ao painel `RELATORIOS` e preserva o painel antigo em uma seção expansível. A tela financeira geral não foi alterada. O modal aceita permissão parametrizada, mantendo `sales` como padrão para seus consumidores antigos. O gerador de XLSX foi generalizado preservando a função original de vendas.

A navegação original foi preservada: a opção Varejo já habilita `/vendas`, e os relatórios seguem esse mesmo acesso. As permissões dos relatórios continuam verificadas individualmente no backend.

## Regras aplicadas

- Empresa vem exclusivamente do usuário autenticado. Campo de empresa enviado na query é rejeitado.
- Consultas de leitura sob snapshot `RepeatableRead`; nenhuma gravação nos dados de origem.
- Permissões de visualização, impressão e exportação verificadas no backend conforme a fonte. Projeção exige banco, contas a pagar e contas a receber.
- Valores calculados com `Prisma.Decimal`; arredondamento monetário para duas casas na apresentação.
- Períodos de até 366 dias e fuso explícito `America/Manaus`, com fim do período exclusivo no início do dia seguinte.
- Até 20.000 registros de origem e linhas de resultado. Acima disso, erro explícito solicitando filtros, sem gerar totais incompletos. Exportação e impressão recebem todas as linhas elegíveis dentro desse limite.
- Títulos: principal liquidado = pagamentos + descontos − juros. Saldo e atraso são atuais; período filtra vencimento.
- Pagamentos mistos: valores efetivamente registrados por modalidade; contagem por modalidade não é aditiva. A compensação de dívida não é subtraída novamente do valor de pagamento da troca.
- Produtos: devoluções concluídas no período reduzem quantidade e receita. Valor efetivo da devolução é rateado entre os itens devolvidos; descontos/acréscimos gerais são rateios gerenciais identificados. Não equivalem a alocação fiscal histórica individual.
- ABC: base apenas de indicadores positivos, antes da aplicação de qualquer Top; item que cruza um limite permanece na classe em que começou.
- A troca de empresa/usuário remonta a tela, descartando resultados e prévias anteriores.

## Limitações explícitas e partes não implementadas

Não tratar a entrega como apuração contábil completa nem como homologação dos dados reais.

1. **Lucro, margem, markup, rentabilidade por cliente, ranking/ABC por lucro e CMV:** indisponíveis porque a montagem dos itens de venda não grava custo histórico. Não foi feita mudança estrutural para começar a gravá-lo. A DRE parcial exibe composição comercial; demais linhas são indisponíveis, nunca zero presumido.
2. **Inventário físico/divergências, giro e cobertura certificados:** não entregues; faltam contagens físicas e validação de histórico de estoque apropriado. Movimentos não registram operador, documento e saldos anterior/posterior. Balanço reconstrói variações físicas totais, sem inventar segregação entre compras e demais naturezas.
3. **Custeio:** valorização é quantidade atual × custo cadastral de compra mais adicional. Não foi implementado custo médio histórico. Marca, tipo, categoria, subcategoria e fornecedor filtram cadastro atual.
4. **Estruturas ausentes:** não criar grupo/subgrupo ou centro de custo fictício. Receitas por categoria usam categoria bancária registrada, sem presumir classificação financeira dos recebíveis.
5. **Conciliação externa e livro caixa:** acesso aos módulos existentes, sem implementar novo importador/extrato externo nem duplicar o tratamento de dinheiro físico, créditos e estornos do caixa.
6. **Comparação e agrupamentos:** compara com intervalo imediatamente anterior de igual duração; não oferece dois intervalos arbitrários. Agrupamentos temporais disponíveis são dia/mês. Período personalizado permite consultar mês, trimestre ou ano dentro do limite.
7. **Projeção:** simulação do saldo bancário atual mais saldos abertos com vencimento no intervalo. Não é posição histórica; não inclui compromissos sem título nem títulos fora do intervalo.
8. **Homologação:** consultas reais e inspeção visual de prévia/impressão/Excel ainda precisam ser conferidas em sessão autenticada pelo responsável, inclusive confronto de totais com os documentos de origem. Testes automatizados usam fixtures somente na suíte de testes; a aplicação não contém dados demonstrativos.

Mudanças futuras para custo histórico, contagens de inventário e classificação contábil exigem projeto estrutural e aprovação, conforme o pedido. Nenhuma dessas estruturas foi criada automaticamente.

## Validações executadas

- `npm.cmd test -- --runInBand` no backend: **34 suítes, 290 testes aprovados**.
- Testes novos cobrem todas as consultas em período vazio, filtro de empresa, ação sem permissão, query inválida, precisão/ABC, mistura de modalidades, principal com juros/descontos, reconstrução de estoque/banco, paginação, exportação completa, limite de volume, filtros combinados, ausência de custo e devolução sem novos itens.
- `node scripts/test-management-report-export.cjs`: HTML e XLSX aprovados, incluindo escape, metadados, células numéricas, códigos com zeros e fórmulas como texto; exportador legado também exercitado.
- O mesmo script verifica que a central está incorporada a Vendas, que não existe página independente nem links para o financeiro geral, e que as restrições anteriores de navegação são mantidas.
- Após a revisão final: **47 testes específicos da central aprovados**, ESLint do novo backend sem erros e build do backend repetido com sucesso.
- Build do backend aprovado, com geração do cliente Prisma local e compilação Nest; sem migração.
- Build do frontend aprovado, com a rota `/vendas?view=RELATORIOS` gerada. Verificação TypeScript e ESLint direcionados repetidos após ajustes finais.
- ESLint direcionado: sem erros. Oito avisos de imports não utilizados já existentes na tela financeira preservada.

Não foram executados commits, pushes, scripts de deploy ou migrações. Alterações locais preexistentes de limpeza foram preservadas.
