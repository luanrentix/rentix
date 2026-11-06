# Implementações de Confecções — 06/11/2026

## Ajuste posterior — fotos de produtos

- Fotos e documentos podem ser selecionados no cadastro novo, com limite de 10 MB por arquivo. Imagens selecionadas aparecem em prévia e podem ser removidas antes da gravação.
- O produto é gravado primeiro e os anexos são enviados pela infraestrutura existente de arquivos. Se um envio falhar, o cadastro salvo é mantido em edição e apenas os anexos ainda pendentes são mantidos para nova tentativa; não é criado outro produto.
- Em produtos existentes, o envio imediato continua disponível. Os anexos de imagem são exibidos na aba Fotos / Anexos.
- A primeira foto aparece no catálogo, na seleção de produtos e nos itens do atendimento. Produtos de grade sem foto própria utilizam a foto da matriz; produtos sem imagem mantêm sua apresentação textual. Imagens indisponíveis exibem indicador de falha.
- A consulta das fotos é restrita à empresa autenticada, ao tipo imagem e aos identificadores dos produtos retornados. Não houve alteração da estrutura do banco ou do serviço compartilhado de arquivos.
- Arquivos: `app/vendas/produtos-panel.tsx`, `product-picker.tsx`, `page.tsx`, novo `product-photo.tsx`; `services/vendas.service.ts`; `contrx-backend/src/vendas/vendas.service.ts` e novo `vendas-fotos.spec.ts`.
- Validações: testes de fotos e do serviço de vendas, lint do componente de imagem, TypeScript e builds locais. O fluxo visual de seleção/envio deve ser conferido com imagens reais no navegador.

## Ajuste posterior — busca nas listas de Abrir

- Campo de busca em Orçamentos, Condicionais, Em andamento e Vendas gravadas, por número do documento, cliente ou vendedor.
- Busca enquanto digita, sem distinção de maiúsculas e acentos; aceita número com prefixo `#`. Cada categoria conserva seu próprio texto de busca.
- Botão Limpar busca, limpeza por Escape, contador filtrado e mensagem quando não há resultados.
- Alteração restrita a `app/vendas/page.tsx`, sem mudanças em APIs, banco ou regras de negócio.

## Ajuste posterior — vendas gravadas

- A lista de Vendas gravadas exibe o status comercial registrado, com indicadores para Concluída, Cancelada, Estornada e Em andamento, sem presumir situação financeira.
- Detalhes / pagamentos e Visualizar comprovante ficam no botão Ações. O botão Abrir foi removido dessa lista.
- As ações das demais listas permanecem preservadas. Não houve alteração de backend, banco ou regras financeiras neste ajuste.
- Arquivos: `app/vendas/page.tsx` e novo `app/vendas/recorded-sale-actions.tsx`.

## Ajuste posterior — lista Em andamento

- Renomeado “Vendas ativas” para “Em andamento” no menu e no título da lista, mantendo os endereços existentes.
- Na lista Em andamento, as opções Abrir, Detalhes / pagamentos, Comprovante e Excluir ficam reunidas no botão Ações.
- Excluir abre o modal de confirmação padrão. A venda só sai da lista após sucesso; erros são apresentados no próprio modal e cliques repetidos são bloqueados.
- O novo endpoint autenticado `POST /vendas/pedidos/:id/descartar` permite somente documentos em andamento da empresa atual. Utiliza cancelamento auditável, preservando o documento; a versão é conferida novamente dentro da transação para impedir exclusão após alteração concorrente.
- Listas de orçamentos, condicionais e vendas gravadas mantêm suas ações anteriores. Não há alteração adicional de banco.
- Arquivos envolvidos: `components/layout/app-shell.tsx`, `app/vendas/page.tsx`, novo `app/vendas/pending-sale-actions.tsx`, `services/vendas.service.ts`, `contrx-backend/src/vendas/vendas.controller.ts`, `vendas.service.ts` e `vendas.service.spec.ts`.
- Validação do serviço: 58 testes aprovados, incluindo exclusão com preservação do histórico, recusa de venda concluída e conflito de versão.

## Escopo e ativação

Implementações no módulo `/vendas`, condicionado ao ramo `CONFECCOES` e ao `companyId` autenticado. O usuário descartou a denominação “Resto”. As alterações locais anteriores foram preservadas. Não foram executados commit, push, deploy ou migração de banco.

**Pré-requisito para utilizar os novos fluxos financeiros:** aplicação manual da migração `contrx-backend/prisma/migrations/20261106120000_sales_credit_adjustments_refund_settlements/migration.sql`, antes de ativar esta versão. A preparação do arquivo foi autorizada; sua execução não foi autorizada nesta sessão. Validar primeiro em banco de homologação com backup e dados representativos.

A migração cria somente três tabelas complementares, suas referências, índices, constraints e RLS: `vendas_ajustes_credito`, `vendas_reembolsos`, `vendas_liquidacoes_reembolso`. Não modifica registros históricos ou colunas das tabelas existentes. Os campos inversos adicionados ao schema Prisma representam relações, sem novas colunas nas tabelas existentes. O acesso das novas tabelas segue o backend autenticado; não foram criadas políticas de acesso direto pelo cliente Supabase.

## Entregas

- Em andamento: limpa o atendimento somente após gravação bem-sucedida; nova venda utiliza nova chave. A recuperação consulta a versão atual, restaura pagamentos de cartão dos eventos e avisa sobre cadastros indisponíveis. Substituir um carrinho não gravado exige confirmação.
- Menu: Cadastros inicia recolhido; a alteração está no trecho exclusivo de Confecções. Os grupos remontam recolhidos ao fechar/reabrir a barra; a navegação com a barra aberta preserva o estado corrente.
- Vendedores: menu no padrão de clientes, visualização, edição, inativação e exclusão condicionada à ausência de qualquer venda histórica. Não foi criada reativação, pois não existia essa regra no cadastro.
- Comprovantes: prévia maior e rolável; impressão somente por clique. A confirmação da venda agora informa “Confirmar e visualizar”. O gerador do comprovante foi preservado.
- Vendas gravadas: detalhes, itens, parcelas, recebimentos, eventos, documentos de devolução e comprovante, sem carregar venda encerrada no atendimento.
- Relatórios: filtros de período, número, cliente, vendedor, pagamento, situação, tipo, produto, categoria atual, fornecedor, conta/caixa, último operador registrado e faixa de valores; ordenação, paginação, descontos, ticket médio e comissões. Impressão/PDF utiliza o diálogo do navegador; Excel gera arquivo `.xlsx` real, com texto em células sem execução de fórmulas.
- Orçamentos: origem registrada nos eventos novos permite identificar conversão. Não se infere origem de documentos antigos sem evidência. Não se cria estado de expiração inexistente.
- Condicionais: quantidades agregadas são reconstruídas dos snapshots de reserva preservados e do documento atual. Condicionais convertidos continuam localizáveis pela origem. Ausência de histórico limita a apuração.
- Créditos de Clientes: consulta de saldo/histórico, concessão e ajustes justificados; lançamentos complementares imutáveis, sem exclusão física. O saldo soma lançamentos antigos ativos e ajustes novos, com Decimal no backend.
- Uso do crédito: preserva o pagamento `SALDO_CLIENTE` e o misto; inclui ajustes no saldo validado sob o mesmo bloqueio de empresa utilizado pelas vendas. Utilização não cria entrada bancária. Estorno de utilização restaura o crédito pelo mecanismo anterior.
- Estorno comercial: restaura estoque/reservas, preserva recebimentos e cancela recebíveis. Recebimentos bancários confirmados geram solicitações de reembolso sem saída imediata. Movimentações pendentes exigem conciliação antes do estorno, sem exclusão física.
- Reembolso: confirmação parcial ou total, com motivo e responsável, ou conversão em crédito para cliente identificado. A mesma chave não pode ser reutilizada com valores/destino diferentes. O total liquidado não pode ultrapassar o solicitado. A referência bancária aponta para a transação original.
- Troca/devolução já existente: reembolso imediato requer confirmação explícita da devolução efetiva na interface e no payload, registrada no evento da venda. O sistema não executa Pix nem aciona adquirentes.
- Ajuste negativo: impede saldo negativo e concilia eventual excesso da obrigação antiga por lançamento não monetário identificado, sem saída bancária.
- Caixa: resumo separado de créditos gerados, usados, ajustados e revertidos e saldo atual devido. Esses valores não compõem entradas ou saldo monetário. O resumo usa período e empresa; filtros de conta, forma e busca aplicam-se apenas aos movimentos monetários, conforme indicação na tela e no impresso.

## Arquivos alterados nesta sessão

Frontend existente: `app/vendas/page.tsx`, `sale-receipt-modal.tsx`, `payment-panel.tsx`, `vendedores-panel.tsx`, `relatorios-panel.tsx`, `estornos-panel.tsx`, `troca-modal.tsx`, `caixa-panel.tsx`, `cash-report-modal.tsx`; `components/layout/app-shell.tsx`; `services/vendas.service.ts`, `services/cash-report.ts`.

Frontend novo: `app/vendas/vendedor-acoes.tsx`, `sale-details-modal.tsx`, `creditos-panel.tsx`, `cash-credits-summary.tsx`; `services/sales-credit.ts`, `services/sales-report.ts`; `scripts/validate-sales-report-local.cjs`.

Backend existente: `contrx-backend/prisma/schema.prisma`; `src/vendas/vendas.service.ts`, `vendas.controller.ts`, `vendas.module.ts`, `dto/criar-venda.dto.ts`, `vendas.service.spec.ts`, `vendas-clientes-exclusao.spec.ts`.

Backend novo: migração acima; `src/vendas/credit-ledger.ts`, `creditos.controller.ts`, `creditos.controller.spec.ts`, `order-history.ts`, `order-history.spec.ts`, `vendas-vendedores-exclusao.spec.ts`.

## Permissões e consistência

As regras gerais de autenticação e permissões não foram reconfiguradas. Os novos comandos sensíveis e os estornos de documentos encerrados exigem proprietário/administrador ou dono do sistema, além da permissão existente `sales`. Cancelar um atendimento em andamento conserva a autorização de vendas. As consultas permanecem disponíveis a quem já pode acessar vendas.

Concessão, ajuste, finalização, estorno e confirmação usam transações e bloqueiam a mesma linha da empresa para serializar operações financeiras. As tabelas complementares possuem chaves únicas de requisição. Registros de crédito manual também impedem exclusão do cliente.

## Validação e limites

Resultados: suíte Jest completa com **26 conjuntos e 178 testes aprovados**; builds locais do frontend e backend aprovados; validadores locais de recibos, pagamentos, relatório de vendas/Excel, caixa e separação de navegação por empresa aprovados. Lint executado nos novos componentes/serviços e no painel de relatórios. O leitor de eventos também recebeu validação específica após ajuste de tipagem.

Os testes automatizados de serviço usam doubles do Prisma: verificam regras e chamadas, mas não substituem testes de concorrência, rollback e constraints em PostgreSQL real. A nova migração não foi aplicada, portanto os fluxos dependentes das novas tabelas ainda precisam de homologação integrada e visual.

A verificação adicional `tsc --noEmit` do backend (incluindo os testes fora do build) apontou incompatibilidades de tipos em `admin.service.spec.ts`, `autenticacao.service.spec.ts` e `contratos.service.spec.ts`, arquivos não alterados nesta sessão. Não foram corrigidos por estarem fora do escopo. O build de produção exclui esses testes e foi aprovado; a suíte Jest também foi aprovada.

Antes do envio manual: aplicar a migração em homologação; testar dois operadores disputando a mesma venda/saldo, falha transacional, estorno repetido, reembolso parcial, Pix/cartão confirmado, crédito manual negativo, venda mista de R$ 150 de crédito + R$ 70 de Pix, impressão longa e celular; repetir com outra empresa e outro segmento. Conferir que o caixa registra somente R$ 70 de entrada no exemplo.

Cancelamento fiscal permanece no emissor fiscal. Não foram adicionadas integrações bancárias, adquirentes ou emissão/cancelamento fiscal. O último operador é apresentado por identificador quando não há nome registrado. Categoria reflete o cadastro atual, não um histórico de classificação.

## Retorno de versão

Não apagar as novas tabelas se já houver movimentação. Reversões financeiras devem utilizar lançamentos compensatórios. Recuar o código após uso dos créditos complementares exige conciliar esses saldos: a versão anterior não considera os novos lançamentos. A estratégia de retorno deve ser validada em homologação antes de qualquer envio manual.
