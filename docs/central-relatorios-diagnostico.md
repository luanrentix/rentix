# Central de relatórios — diagnóstico e execução

## Recursos existentes

- `app/vendas/relatorios-panel.tsx`: vendas simples/completas, orçamentos, condicionais, pedidos, cancelamentos, filtros e paginação local. Usa os pedidos carregados pela tela, portanto não é fonte adequada para novos agregados globais.
- `services/sales-report.ts`: HTML escapado e geração de XLSX com JSZip. `app/vendas/cash-report-modal.tsx`: prévia, impressão e PDF pelo navegador.
- `contrx-backend/src/vendas/caixa.service.ts` e `services/cash-report.ts`: caixa com tratamento próprio de créditos, estornos e modalidades. Preservar sua lógica.
- `financeiro/financeiro.service.ts`: resumo financeiro por caixa/competência; telas de contas a pagar, receber e bancos já possuem consultas próprias.
- `app/financeiro/relatorios/page.tsx`: DRE sobre títulos, balancete de disponibilidades/obrigações, fluxo mensal e aging já disponíveis, com cálculos no navegador e exportação CSV. Mantidos no módulo geral, separados da configuração Varejo e sem atalhos para a central de vendas. As novas consultas aprimoram a apuração no backend: DRE comercial explicitamente parcial, balancete/fluxo exclusivamente bancários e aging dos saldos por cliente. São bases identificadas na tela, sem modificar o funcionamento anterior.

## Criar e melhorar

Criar central agrupada com consultas autenticadas de leitura no backend, filtros comuns, metadados, totalizadores, paginação e exportação. Novos relatórios: vendedores, períodos, clientes, produtos, ABC, pagamentos comerciais; posição, mínimos, negativos, valorização, movimentos, balanço e inatividade; títulos, atrasos, recebimentos e pagamentos por período/categoria. Preservar acesso aos relatórios existentes sem duplicar o caixa.

## Dados e relacionamentos

`Company` delimita todas as consultas. `SalesOrder` referencia cliente/vendedor e contém itens e pagamentos em JSON; eventos por pedido. `SalesProduct` contém classificações e custo cadastral; `SalesStockMovement` referencia produto. `ContaReceber` e `ContaPagar` possuem pagamentos filhos, vinculados à empresa pelo título. `BankTransaction` pertence à empresa pela conta bancária. Créditos, reembolsos e ajustes comerciais possuem empresa própria.

## Limitações comprovadas e riscos

- A montagem dos itens em `vendas.service.ts` não grava custo histórico. Lucro, margem, markup, ranking por lucro, rentabilidade por cliente e CMV/DRE completos não podem ser calculados com confiabilidade. Não usar custo cadastral atual como substituto.
- Movimentos de estoque não possuem operador, documento, saldo anterior/posterior nem contagem física. Balanço reconstruído depende de histórico completo; não afirmar inventário físico ou custeio médio inexistentes.
- Não há centro de custo nos títulos. Receitas não possuem categoria financeira própria. Não inventar classificações.
- Trocas possuem devoluções, compensações e reembolsos; faturamento comercial e recebimento são bases diferentes. Não somar pedidos, títulos e transações bancárias.
- Permissões de `sales`, `financial`, `accountsReceivable`, `accountsPayable`, `bank` e ações devem ser verificadas conforme a fonte.
- Grandes volumes precisam de limites explícitos; resultados incompletos não podem ser apresentados como totais globais.
- Nenhuma migração é necessária. Alterações de custo histórico, inventário físico e plano contábil dependem de aprovação estrutural e ficam fora desta implementação.

## Fases

1. Catálogo, filtros, resultado comum e metadados.
2. Consultas comerciais e ABC, com alertas sobre custo histórico e devoluções.
3. Estoque cadastral e movimentos reais; reconstrução identificada.
4. Títulos e pagamentos; reuso do caixa e resumo financeiro existentes.
5. Indicadores sustentados pelos dados; documentar indicadores indisponíveis.
6. Prévia, impressão/PDF e XLSX comuns.
7. Testes de cálculo, filtros, isolamento, permissões e builds locais. Conferência em banco real e UI depende de ambiente autenticado disponível.

Não executar commits, pushes, deploys ou alterações nos registros de origem. Alterações locais de limpeza preexistentes são preservadas.
