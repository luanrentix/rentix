# Auditoria funcional e técnica da tela de vendas

Data: 09/11/2026. Escopo: configuração **Varejo** (valor interno `CONFECCOES`), `/vendas`, seus painéis, serviços HTTP, regras de venda/estoque/financeiro, relatórios e testes relacionados.

## 1. Parecer executivo

A base transacional é mais sólida do que a análise de 05/11 descrevia. Foram confirmados recálculo no backend, isolamento de empresa nas operações exercitadas, controle de versão, idempotência de criação, reserva de condicionais, integração financeira e separação entre estorno comercial e reembolso efetivo.

Entretanto, **não recomendo homologação integral do PDV no estado atual**. Há falhas reproduzidas de arredondamento, acumulação de quantidades fracionadas e substituição de preço ao repetir produto. Há também descarte de atendimento sem proteção uniforme e uma ação “Em Andamento” de troca que conduz ao fluxo de conclusão.

Foram registrados **21 apontamentos: 5 de prioridade alta, 13 média e 3 baixa**. Prioridade considera impacto operacional e ordem sugerida de correção; não significa que todos sejam vulnerabilidades de segurança. Regras comerciais sem definição explícita foram separadas das falhas comprovadas.

**Nenhuma correção no código de aplicação foi realizada nesta auditoria.** Os únicos arquivos adicionados ao projeto por esta revisão são este relatório e o JSON de evidências. Testes auxiliares foram executados em arquivos temporários. Alterações de implementação e limpeza que já existiam no workspace foram preservadas.

## 2. Método e limites da conclusão

- Leitura do código atual, contratos HTTP, DTOs, componentes, schema e testes de Vendas, Caixa, Créditos, Cartões e Relatórios.
- Execução da suíte completa do backend e de sete verificadores locais de frontend/exportação.
- Extração de funções reais do frontend com a AST do TypeScript, executadas isoladamente para reproduzir falhas sem gravar vendas reais.
- Testes de serviço no PostgreSQL **local `contrx`, porta 55432**, usando empresas e cadastros exclusivos de teste dentro de uma transação externa revertida. As transações internas do serviço foram representadas por savepoints. Foram exercitados efeitos reais sobre tabelas, com falhas injetadas em chamadas de estoque/financeiro.
- Conferência final: **zero empresas de teste persistidas**. Os cadastros e documentos reais não foram usados como fixtures. Sequências PostgreSQL podem consumir números durante transações revertidas; os testes não verificam numeração sem lacunas.
- O acesso de automação ao navegador retornou `The browser access host is unavailable`. Não houve testes visuais de clique, viewport ou teclado nesta rodada. Os prints fornecidos pelo usuário sustentam apenas os estados neles visíveis.
- Não foram feitas operações em produção, migrações, commits, pushes ou deploys. Não foi disparado o protocolo geral das dez áreas; esta é a auditoria específica solicitada para Vendas.

**Classificação de evidência:** “reproduzido” significa execução de função ou serviço, não necessariamente clique no navegador. “Código” significa caminho comprovado por inspeção, com reprodução visual ainda pendente. “Decisão comercial” não deve ser corrigida por suposição.

## 3. Inventário e avaliação ponto a ponto

| Área/processo | Situação atual e avaliação |
|---|---|
| Menu e configuração | Central incorporada a **Vendas → Relatórios**, sem página independente. Navegação de Varejo separada das telas gerais. API nova de relatórios ainda precisa alinhar a verificação de ramo: F17. |
| Cabeçalho | Cliente/vendedor/tipo presentes. Número novo é estimado; data mostra o dia atual mesmo ao recuperar documento: F20. |
| Inicialização | Carrega contas, catálogo, histórico completo e cadastros. Erros de um recurso afetam os demais; estado `loading` do pai não é usado para apresentar prontidão: F13/F15. |
| Nova venda | `clearSale` limpa carrinho, valores, parcelas, cartões e observações. Mantém conta anterior e não protege todos os descartes: F04/F09. |
| Cliente | Seleção por ID e validação da empresa/atividade no servidor. Referência sem cadastro completo é permitida à vista e bloqueada no crediário. Cartão simples troca cliente automaticamente: F06. |
| Vendedor | Obrigatório, vinculado por ID e validado ativo no backend. Consulta, edição e exclusão possuem testes. Atualização deve preservar erros individuais e evitar esvaziamento conjunto: F15. |
| Cadastro rápido | Há cadastro de produto e seleção/cadastro de cliente; Produtos possui callback para atualizar catálogo do pai. Não reapresentar a antiga falta de atualização como defeito ainda aberto. |
| Pesquisa de produtos | Nome/código/referência/barras e seleção por variação. Caminho de barras de variação não aplica os mesmos filtros de atividade: F08. |
| Grade/variação | Matriz não é vendida; backend exige cadastro apropriado e variação válida quando existente. Troca de variação também pode mesclar linhas e perder distinção de preços: F03. |
| Quantidades e unidades | Backend aceita três casas; frontend acumula ponto flutuante e a devolução aceita só duas: F02/F07. Política de fracionamento por unidade ainda é decisão de negócio. |
| Preço | Preço promocional e bloqueios de desconto/acréscimo do produto são verificados no servidor. Repetição de item sobrescreve preço da linha: F03. |
| Desconto por item | Representado por alteração do preço unitário; não há campo separado de desconto de item com base histórica exibida. Não confundir essa limitação com ausência de validação de preço no servidor. |
| Desconto/acréscimo geral | Backend limita descontos conforme produtos elegíveis. Interface usa `number`; diferença de arredondamento existe antes desses ajustes: F01. Percentual exibido precisa acompanhar a base alterada ou deixar claro o modo fixo/percentual. |
| Frete | Não há composição específica identificada no DTO da venda. Não é falha comprovada sem requisito comercial de cobrança de frete. |
| Dinheiro e troco | Há valor entregue, validação de cobertura e cálculo de troco. O entregue é somente estado da tela; a reimpressão não o recupera: F14. |
| Pix | Aviso orienta confirmação manual. A gravação é registro manual, sem integração bancária automática ou confirmação eletrônica verificada. |
| Cartões | Modal coleta administradora, bandeira, NSU e parcelas. Dados são guardados em eventos, mas sua presença não é obrigatória no backend: F12. Parcelamento de cartão não é parcelamento de crediário. |
| Pagamento misto | Distribuição em centavos, métodos normalizados e soma exata no servidor. Pode rejeitar total montado pelo arredondamento errado da tela: F01. |
| Crediário | Cliente identificado, prazo, bloqueio e limite disponível validados no servidor; parcelas fecham em centavos. Tela mostra limite cadastrado e avisa que débitos serão considerados; falta saldo disponível antecipado. |
| Crédito de cliente | Compensação separada de entrada monetária e protegida no backend. Falha ao consultar saldo aparece como zero na tela: F15. |
| Em andamento | Venda comum é salva, retirada do editor e pode ser recuperada. Troca não segue esse comportamento: F05. Retentativa de atualização após resposta perdida não tem recuperação assistida: F11. |
| Orçamento/pedido | Não representam recebimento. Conversão usa documento e versão; backend não deve ser tratado como estoque genérico para todos os tipos, como dizia o relatório antigo. |
| Condicional | Reserva separada de baixa física; conversão libera reserva e baixa somente itens mantidos. Cancelamento libera a reserva. Há testes específicos. |
| Finalização | Referência de envio e bloqueio de duplo clique; transação de estoque/financeiro. Campos continuam editáveis durante o envio: F10. |
| Vendas gravadas | Situação, detalhes, pagamentos, eventos e reimpressão. Lista inteira em memória, sem paginação visual nessa tela: F13. Reimpressão direta usa cópia da lista: F14. |
| Trocas | Origem vinculada, limite de devolução, abatimento de dívida e tratamento da diferença. Quantidade fracionada e ação Em Andamento precisam correção. |
| Estorno/cancelamento | Verificação de autorização administrativa para operações sensíveis, dependências de devolução e controle de versão. Estorno comercial cria pendência financeira, sem fingir dinheiro devolvido. |
| Caixa | Suprimento/sangria, motivo, operador, idempotência e saldo físico separado do eletrônico. Não equivale a sessão formal de abertura/fechamento diário. |
| Comprovante | Modal `max-w-5xl`, altura `94dvh`; abre somente visualização. `onLoad` apenas marca pronto. Impressão exige botão e autorização. Fechar não desfaz venda. Este requisito já está atendido no código. |
| Relatórios | Consultas reais por empresa, permissões por fonte, limite explícito, paginação e exportação. CMV/lucro sem custo histórico permanecem indisponíveis. Não inventar valores para completar DRE. |
| Contratos/planos | Não foi identificada dependência obrigatória de contrato imobiliário no fechamento do varejo. Não introduzir essa integração por suposição. |
| Responsividade | Container queries em 600/850/1100px, tabela com largura mínima, rolagens internas e altura calculada. Há estrutura adaptativa; qualidade visual em cada resolução ainda não foi homologada. |
| Teclado e modais | F2/F3/F4/F5/F6/F8/F9 implementados. Confirmação possui contenção/restauração de foco; demais modais não têm tratamento uniforme: F19. |

## 4. Apontamentos detalhados

### F01 — Alta: total do frontend diverge do backend

**Evidência:** `app/vendas/page.tsx:345`, `:348`; `contrx-backend/src/vendas/vendas.service.ts:2561`.

A tela multiplica `number` e aplica `Math.round` com `Number.EPSILON`. O backend usa `Prisma.Decimal` e `ROUND_HALF_UP` por linha. As estratégias não são equivalentes.

**Reprodução:** R$ 0,75 × 2,9 gera subtotal de **R$ 2,17** no frontend e **R$ 2,18** no backend. Confirmado também no PostgreSQL local. Outros casos: 0,87 × 2,5; 0,90 × 2,65; 0,95 × 2,3 divergem um centavo.

**Impacto:** confirmação pode mostrar valor diferente do gravado; cartão/misto podem ser recusados pela diferença; validação de dinheiro entregue e troco pode usar base inferior ao recebimento registrado. O backend mantém o cálculo correto, mas a negociação na tela fica inconsistente.

**Correção proposta:** uma política decimal única para linha, subtotal, ajustes, parcelas e troco. Quantidade em milésimos e dinheiro em centavos com aritmética exata/limites seguros, ou biblioteca decimal compatível. Antes de confirmar, validar o total calculado pelo servidor sem substituir silenciosamente o preço negociado.

**Aceite:** os quatro exemplos e uma matriz ampla de fronteiras fecham exatamente entre tela, payload, documento, parcelas e comprovante.

### F02 — Alta: soma de quantidades válidas produz payload inválido

**Evidência:** `page.tsx:516`; `dto/criar-venda.dto.ts:29`.

**Reprodução:** adicionar 0,1 e depois 0,2 do mesmo item resulta em `0.30000000000000004`. O DTO real rejeitou esse valor por exceder três casas decimais.

**Impacto:** venda fracionada legítima pode falhar apenas na gravação. A quantidade visual arredondada parece correta ao operador.

**Correção:** normalizar operações e fusões de quantidade em milésimos, incluindo troca de variação e edição. Não apenas arredondar o texto exibido.

**Aceite:** inclusões repetidas de 0,1/0,2 e 0,001 mantêm precisão e passam pelo DTO sem ultrapassar a quantidade real.

### F03 — Alta: repetição de produto altera preço das unidades anteriores

**Evidência:** `page.tsx:516–517`; fusão de variações em `:1432` em diante.

**Reprodução:** carrinho com 1 unidade a R$ 10; incluir outra do mesmo produto/variação a R$ 20 produz 2 unidades a R$ 20: **R$ 40**, em vez de preservar R$ 10 + R$ 20 = R$ 30. A mudança ocorre sem confirmação.

**Impacto:** preço já negociado pode ser substituído. Na fusão de variações, o preço preservado depende da linha encontrada, sem política explícita de conciliação.

**Correção:** definir identidade da linha considerando preço/condições comerciais, ou exigir confirmação expressa para reprecificar todas as unidades. Não calcular média silenciosa, pois isso cria outra regra comercial.

**Aceite:** repetir produto com mesmo preço soma quantidades; preços diferentes mantêm valores negociados ou pedem confirmação clara.

### F04 — Alta: descarte de atendimento sem proteção uniforme

**Evidência:** efeito de navegação em `page.tsx:298–330`, seletor de tipo `:1245`, `clearSale:879`. Não há rotina de recuperação de rascunho local nem proteção `beforeunload` identificada na tela.

Nova venda e seleção de Troca chamam limpeza sem a mesma confirmação existente em `openOrder`. Atualização/fechamento do navegador também perde estado não gravado.

**Impacto:** perda de carrinho, cliente, condições e observações durante atendimento.

**Correção:** detector único de alterações pendentes; confirmação em descarte real; rascunho recuperável por empresa/usuário com validade e limpeza segura após confirmação do salvamento. Evitar gravar dados de cartão desnecessários em armazenamento persistente do navegador.

**Aceite:** navegar, trocar tipo, atualizar e restaurar sessão têm comportamento definido; nenhuma confirmação redundante quando não há alterações.

### F05 — Alta: Em Andamento de troca conduz à conclusão

**Evidência:** `page.tsx:646–658`, botão em `:1571`, callback do modal ao final da tela. `prepareReturn` no backend recusa troca em andamento.

**Reprodução isolada:** `saveSale('EM_ANDAMENTO')` com tipo `TROCA` abre o modal de devolução. A confirmação desse modal chama **`saveSale('CONCLUIDA', decision)`**, sem preservar a intenção original de estacionar a operação.

**Impacto:** o botão não entrega o processo anunciado. O operador pode avançar para conclusão quando procurava apenas guardar um rascunho. Existe confirmação no modal; não é uma finalização sem qualquer clique de confirmação.

**Correção:** ocultar/desabilitar Em Andamento para trocas, com explicação, enquanto esse ciclo não for suportado; ou desenhar rascunho específico sem efeitos físicos/financeiros, mediante aprovação da regra.

**Aceite:** ação de estacionar nunca gera movimento de troca concluída; a ação de concluir é distinta e explícita.

### F06 — Média: cartão simples e misto têm associação diferente de cliente

**Evidência:** `page.tsx:1738–1748`.

Ao selecionar débito/crédito simples, a tela chama `selectSaleCustomer(CLIENTE_CARTAO)`, substituindo o cliente previamente identificado. No misto com componente de cartão, essa substituição não é feita no mesmo caminho.

**Impacto:** a mesma compra pode ficar atribuída a clientes diferentes conforme a modalidade escolhida na interface; pode prejudicar histórico, relacionamento e crédito em devoluções. Trata-se de regra implementada, cuja intenção comercial precisa ser confirmada, não de algo a remover automaticamente.

**Proposta:** preferir cliente identificado quando já selecionado; oferecer cadastro genérico como escolha explícita. Se a loja exige anonimização de cartão, uniformizar simples/misto e avisar antes da troca.

### F07 — Média: devolução não aceita a precisão de quantidade suportada pelo sistema

**Evidência:** `app/vendas/troca-modal.tsx:110`, `:363`; `services/sales-payment.ts:32` e DTO de devolução.

O campo tem `step="0.001"` e o backend aceita três casas, mas usa `paymentAmount`, que admite duas casas monetárias. **`1,001` é rejeitado pelo leitor do modal** no teste isolado.

**Impacto:** não é possível devolver exatamente determinados itens fracionados pela tela.

**Correção:** separar leitor de quantidade do leitor de dinheiro; validar saldo em milésimos e manter dinheiro em centavos.

### F08 — Média: barras de variação pode inserir produto inativo/oculto

**Evidência:** `page.tsx:548–557`; `listProducts` no backend inclui cadastros inativos para fins de gestão.

A busca comum filtra `active` e `showInSale`. O caminho `variantMatch` verifica apenas `!isGridParent`; `addProduct` não reaplica os filtros de atividade.

**Reprodução isolada:** produto inativo e oculto com código de variação foi colocado no carrinho pelo handler real de Enter.

**Impacto:** atendimento avança com item que o backend depois rejeita. **Não foi demonstrada venda efetiva de produto inativo**: o servidor filtra `active/showInSale` e impede a gravação.

**Correção:** aplicar elegibilidade única em toda entrada de produto e repetir verificação em `addProduct`.

### F09 — Média: conta financeira anterior permanece na nova venda

**Evidência:** `clearSale:879–911`; efeito de conta em `page.tsx:383–390`.

`clearSale` não limpa a conta, e o efeito mantém qualquer conta ainda existente antes de considerar a modalidade. O teste confirmou retenção da conta anterior.

**Impacto:** nova operação pode herdar destino financeiro de atendimento anterior. Como os detalhes podem ficar recolhidos quando já há conta, o destino merece destaque. A política atual permite escolher contas de tipos distintos; não assumir que todo dinheiro obrigatoriamente precisa de conta CASH sem definir a regra.

**Correção:** escolher explicitamente política de retenção, preferência da estação ou padrão por modalidade; sempre exibir destino no resumo e na confirmação. Limpar quando incompatível com a política definida.

### F10 — Média: edição continua disponível durante POST

**Evidência:** campos e remoção em `page.tsx:1199`, `:1495–1535`; envio/reset em `:763–854`.

Os botões principais usam `saving`, mas cliente, itens, preços, quantidades, remoção e pagamento não estão integralmente bloqueados durante o envio. O payload já foi montado; no sucesso, o carrinho é limpo.

**Risco pelo código:** com rede lenta, alterações feitas depois do envio podem não constar na venda e desaparecer no sucesso. Não foi reproduzido por clique no navegador nesta rodada.

**Correção:** congelar o snapshot enviado e bloquear edição/navegação destrutiva até o resultado; indicar claramente “Gravando”. Em falha, preservar o snapshot e permitir recuperação controlada.

### F11 — Média: recuperação de resposta perdida é incompleta

**Evidência:** `requestIdRef:763`; `updateOrder:2050–2078`; rotina de idempotência `saveOrder:2298`.

Criação repetida com a mesma chave e corpo equivalente retorna o mesmo documento — confirmado em banco local. Entretanto, a chave só vive em memória; recarregar a página a perde. Retentativa de atualização já concluída é rejeitada pelo estado/versão, também confirmado em banco. Não há conciliação assistida do resultado após resposta perdida.

A comparação de idempotência de criação não inclui todas as propriedades, como observações, embora rejeite mudanças em itens, valores e associações. Esse é um ponto de revisão da assinatura, não uma duplicação já observada.

**Impacto:** operador pode ficar sem saber se a venda foi gravada e iniciar outra manualmente. A proteção de duplo clique existe; não confundir ausência de recuperação durável com ausência total de idempotência.

**Correção:** persistir identificador mínimo de tentativa e snapshot adequado ao usuário/empresa; consultar resultado por chave; distinguir erro de validação de resultado desconhecido; orientar retomada sem gerar novo documento.

### F12 — Média: metadados de cartão são obrigatórios apenas no fluxo normal da interface

**Evidência:** `contrx-backend/src/vendas/card-payment.ts:16`; `dto/criar-venda.dto.ts:66`; chamada de validação ao salvar.

`validateCardPayments` retorna `[]` quando a propriedade está ausente/vazia, antes de verificar se há valor em cartão. O teste da função confirmou o comportamento. Quando os metadados existem, valor, administradora e parcelas são validados.

**Impacto:** cliente de API ou outro fluxo pode gravar cartão sem os dados que a tela exige para rastreio/conciliação. Isso não demonstra aprovação eletrônica falsa nem cobrança automática: os recebimentos são manuais por desenho.

**Correção:** se NSU/administradora são requisitos da operação concluída, exigir um registro para cada componente de cartão no servidor; permitir rascunhos incompletos e distinguir dados de venda de eventual reembolso.

### F13 — Média: abertura do PDV depende do histórico completo

**Evidência:** `services/vendas.service.ts:441–455`; `page.tsx:227`; `vendas.service.ts:1978–2008`; listagem `page.tsx:1832`.

O backend pagina em lotes de 100, mas o frontend percorre todos os lotes antes de concluir a carga. Cada pedido carrega itens e eventos de criação/atualização. Abrir/gravadas renderiza a lista filtrada inteira. A carga também se repete após salvar.

**Impacto:** custo cresce com o histórico da empresa, mesmo para abrir uma nova venda; piora em rede lenta e pode bloquear a atualização do catálogo se uma página falhar. Não há medição de carga real para quantificar latência ou RAM.

**Correção:** primeira carga mínima para vender; histórico sob demanda, busca/filtros e paginação no servidor; DTO de listagem resumido; detalhes/eventos somente quando necessários. Manter a completude das exportações por fluxo próprio.

### F14 — Média: reimpressão direta pode estar desatualizada e perde dinheiro entregue

**Evidência:** callbacks de comprovante em `page.tsx:1854–1862`; `services/sales-receipt.ts`; `SaleDetailsModal` consulta detalhe atualizado.

O atalho da lista passa `order` já carregado, sem buscar o estado atual, e zera `receiptTender`. Outra sessão pode ter cancelado/alterado o documento desde a carga. O valor entregue e o troco não são persistidos no pedido; a reimpressão não reproduz esses dados. A empresa no cabeçalho vem das configurações atuais.

**Correção:** consultar detalhe atual antes de qualquer reimpressão; identificar documento cancelado/estornado; decidir se dinheiro entregue/troco precisam de histórico imutável. Não reconstruí-los por suposição. Os preços/nomes dos itens gravados já são usados no comprovante.

### F15 — Média: erros, carregamento e vazio são estados pouco consistentes

**Evidência:** `page.tsx:227–263`, `:307–320`, consulta de crédito `:361–377`; `clientes-panel.tsx:73–78`, `:225`, `:258`.

- Falha de clientes/vendedores esvazia ambas as listas em caminhos de atualização.
- Erro de crédito vira saldo zero.
- A tela de clientes pode exibir erro e “Nenhum cliente cadastrado” simultaneamente; os prints fornecidos mostram esse caso.
- Pai e painel filho podem apresentar erros da mesma indisponibilidade. O `loading` do pai não é usado na apresentação.

**Correção:** estados distintos: carregando, carregado vazio, falha sem dados, dados antigos com falha de atualização. Preservar informação válida; erro e nova tentativa por recurso; impedir apenas a ação afetada.

### F16 — Média: URL e painel ativo podem divergir

**Evidência:** sincronização de `searchParams` em `page.tsx:273`; F2 e `openOrder` alteram `activeView` diretamente; botões locais também fazem isso.

Existem duas fontes de navegação: URL e estado local. É possível abrir edição mantendo URL de Abrir, ou entrar em Abrir com URL anterior. Estado divergente é comprovado pelo código; o efeito exato de clicar novamente no mesmo link e do histórico Voltar ainda precisa de teste visual.

**Correção:** definir URL como fonte das seções e estado local apenas para modais/rascunho; separar “retomar atendimento” de “nova venda” para não limpar o carrinho numa navegação de retorno.

### F17 — Média: fronteira de Varejo não é uniforme na API nova de relatórios

**Evidência:** `management-report.service.ts:61–160`; comparação com `VendasService.ensureConfectionery`; consultas financeiras `:195`, `:574` em diante.

A central está corretamente no menu de Vendas. Porém, a API de relatórios valida usuário/permissão/empresa sem verificar o ramo, ao contrário de `VendasService`. Os relatórios de títulos incluem todos os títulos da empresa, sem restrição a `salesOrderId`/devolução comercial.

**Impacto:** a fronteira de navegação não equivale à fronteira da API; em empresa com dados de outros módulos, podem entrar compromissos não originados em Vendas. **Não é evidência de vazamento entre empresas**: os filtros de empresa estão presentes. O escopo financeiro desejado deve ser decidido explicitamente.

**Correção:** aplicar elegibilidade de ramo no backend; definir e mostrar “carteira comercial” versus “financeiro integral da empresa”, com filtros e permissões correspondentes. Não remover registros de outros módulos para resolver a apresentação.

### F18 — Média: roteiro de integração existente não homologa mais o fluxo atual

**Evidência:** `contrx-backend/scripts/validate-sales-flow-local.js`.

**Executado:** falhou com “Selecione o cadastro do tamanho/cor para vender. A matriz da grade não possui estoque próprio.” A fixture trata a matriz como cadastro vendável, após a mudança para produtos independentes. O cliente de fixture também precisa acompanhar os requisitos atuais de cadastro completo para crediário; o roteiro parou antes de todos os cenários.

**Impacto:** não se pode usar a aprovação histórica desse script como evidência atual de integração completa. A rejeição da matriz é uma proteção correta do sistema, não defeito a remover para fazer o teste passar.

**Correção:** atualizar somente o roteiro/fixtures após aprovação da fase de correções; manter rollback e bloqueio de ambiente remoto; testar também os novos casos de cálculo e recuperação. O ensaio complementar desta auditoria usou produto simples e confirmou os cenários listados na seção 6.

### F19 — Baixa: tratamento de teclado e foco varia entre modais

**Evidência:** `components/ui/confirmation-modal.tsx` possui Tab/Escape/restauração; `card-payment-modal.tsx`, `troca-modal.tsx` e seleção de variação não apresentam o mesmo tratamento completo.

**Impacto potencial:** navegação de teclado pode alcançar a tela atrás do modal; Escape e retorno de foco não são uniformes. Depende de teste visual/tecnologia assistiva para caracterizar cada comportamento.

**Melhoria:** reutilizar uma base de diálogo com contenção de foco, restauração, título acessível, Escape quando seguro e bloqueio durante envio. Não mudar os modais já corretos sem necessidade.

### F20 — Baixa: identificadores e datas do cabeçalho podem induzir interpretação errada

**Evidência:** `page.tsx:421–424`; `SalesOrder.number` é sequência gerada no banco.

Número de nova venda é estimado pelo histórico, sujeito à concorrência. Data do cabeçalho é sempre “hoje”, inclusive ao abrir documento antigo. Datas usam fuso do navegador em várias telas e Manaus explicitamente nos relatórios.

**Melhoria:** “Nova venda — número após gravação”; ao recuperar, exibir número/data reais e diferenciar data de emissão, atendimento e conclusão. Definir fuso operacional único e mostrá-lo onde necessário.

### F21 — Baixa: consulta de clientes também cria cadastros de sistema

**Evidência:** `vendas.service.ts:94–112` faz dois `upsert` antes de listar.

É inicialização idempotente dos consumidores genéricos, mas ocorre em um caminho GET, inclusive para usuário que só consulta. Não é criação arbitrária por payload nem vazamento.

**Melhoria:** transferir bootstrap para ativação do módulo/rotina própria controlada e deixar listagem sem efeitos de escrita. Preservar cadastros existentes e a associação histórica das vendas.

## 5. Regras e melhorias que dependem de decisão comercial

Estas decisões **não autorizam alterar regras agora**:

1. **Estoque negativo:** atualmente permitido tanto na venda quanto na reserva de condicional, com aviso na tela e teste específico. Não foi classificado como falha de validação. Definir se haverá configuração por empresa, permissão especial e limites.
2. **Cliente de cartão:** decidir preservar identificado, usar genérico opcional ou aplicar outra regra uniforme a simples/misto. Não remover o cadastro genérico de documentos antigos.
3. **Alçadas de desconto/preço:** há bloqueio por produto, mas não foi identificada alçada específica por operador/percentual na criação da venda. O controller usa `sales:create`. Definir limites, autorização e motivo, incluindo preço zero/100% de desconto; não presumir que gratuidade seja proibida.
4. **Preço alterado durante atendimento:** o payload envia preço explícito, respeitando permissões do produto. Definir se prevalece o preço negociado, o preço atual ou nova confirmação. Não reprecificar automaticamente o carrinho sem regra aprovada.
5. **Unidade fracionável:** definir quais unidades aceitam milésimos e quais exigem inteiros.
6. **Destino financeiro por modalidade:** decidir conta única por venda ou destinos distintos para dinheiro/Pix/cartões mistos. Hoje a venda tem uma conta de destino.
7. **Cartão e Pix:** recebimento manual é o escopo atual. Taxas, agenda de adquirente, liquidação futura e verificação eletrônica são expansão, não recursos que o código atual comprove.
8. **Dinheiro entregue/troco:** decidir necessidade de persistência para reimpressão; hoje não são dados gravados na venda.
9. **Caixa diário:** operações e saldo não equivalem a abertura/fechamento por operador, contagem física e divergência. Se desejado, desenhar processo próprio sem duplicar o livro financeiro.
10. **Relatórios de Varejo:** decidir se títulos/indicadores abrangem só origem comercial ou todo o financeiro da empresa.
11. **Frete, descontos individuais explícitos e custo histórico:** definir necessidade e modelo de registro antes de criar campos ou migrations. Lucro histórico e DRE completa não podem ser retroativamente inventados.

## 6. Testes executados e alcance real

| Verificação | Resultado | O que comprova / limite |
|---|---|---|
| `npm.cmd test -- --runInBand` no backend | **34 suítes, 290 testes aprovados** | Casos cobertos pela suíte; grande parte usa mocks, não prova navegação visual ou duas conexões reais concorrentes. |
| Sete scripts locais de pagamentos, recibo, relatório de vendas, relatório de caixa, preços, navegação e exportação gerencial | **Todos aprovados** | Cálculos/cenários já presentes, estrutura dos arquivos, escaping, células de texto/número e navegação declarada. Não cobriam as novas falhas F01/F02/F03/F05/F07/F08. |
| Funções reais extraídas por AST | **Falhas reproduzidas** | Sobrescrita de preço; quantidade fracionada rejeitada pelo DTO; parser de devolução; conta retida; produto inativo via barras de variação; Em Andamento de troca abre modal; ausência de dados de cartão aceita pela função. Evidências no JSON anexo. |
| Ensaio complementar em PostgreSQL local, com savepoints e rollback externo | **Aprovado para os cenários exercitados** | Total backend 2,18; mesma chave retorna mesmo documento; falha financeira reverte pedido/título/estoque/transação/saldo; falha de estoque sem resíduos; rascunho sem financeiro e atualização única; segunda conclusão rejeitada; estorno gera pendência sem saída automática; consulta de pedido alheio negada. |
| Conferência de persistência | **Zero empresas de teste** | Roteiro antigo e ensaio complementar não deixaram as empresas de fixture no banco. |
| Roteiro integrado antigo `validate-sales-flow-local.js` | **Falhou na fixture de grade** | Não completou a homologação; não contabilizar cenários posteriores como aprovados nesta execução. |
| ESLint direcionado ao PDV/pagamento/troca/comprovante/caixa/central | **Zero erros, seis avisos** | Imports/variáveis não utilizados e dependência de efeito. Não elimina falhas de processo. |
| Navegador / responsividade real | **Não executado nesta rodada** | Host de automação indisponível. Não declarar tela visualmente aprovada. |

O ensaio em banco usou a compilação local existente do backend; as rotinas examinadas correspondem ao código atual disponível. Não foram executados novo build ou deploy nesta rodada de auditoria, pois não houve alteração de aplicação.

O driver PostgreSQL emitiu um aviso de depreciação sobre enviar consultas enquanto a mesma conexão já executa outra, com impacto previsto para `pg@9`. Não houve falha por esse motivo nesta execução. A revisão de paralelismo dentro de transações deve entrar no planejamento de atualização do driver, sem remover as garantias transacionais atuais.

### Matriz dos cenários críticos solicitados

| Cenário | Comportamento encontrado | Situação de validação |
|---|---|---|
| Duplo clique em Finalizar | `savingRef`/estado e chave de criação; repetição não duplica | Backend/replay verificados; clique duplo visual pendente. |
| Conexão cai durante gravação | POST não é repetido automaticamente; chave fica em memória | Recuperação de resposta desconhecida precisa melhoria F11; não houve corte real de rede. |
| Atualizar/fechar navegador | Carrinho não gravado não tem recuperação durável identificada | Código; ensaio visual pendente. |
| Duas sessões no mesmo pedido | Versão e bloqueio por empresa; versão velha rejeitada | Testes de versão e segunda atualização; duas conexões simultâneas não ensaiadas. |
| Preço muda durante venda | Preço explícito do atendimento é enviado; regras do produto reavaliadas | Inspeção; decisão de política pendente. |
| Estoque insuficiente | Pode vender/reservar negativo com aviso | Regra existente e testes específicos; não chamar de bloqueio quebrado. |
| Pagamento parcial | Misto incompleto permitido em rascunho; conclusão exige soma exata | Testes de pagamentos e backend. |
| Valores inválidos | DTO e serviço validam; soma fracionada legítima pode se tornar inválida | Falha F02 reproduzida. |
| Falha financeira | Escritas da operação revertidas no ensaio local | Verificado com falha injetada e savepoint. |
| Falha de estoque | Sem pedido/financeiro residual | Verificado com falha injetada. |
| Recuperar documento excluído | Cancelado/estornado abre detalhes, não edição; backend impede reativação | Código e suíte. |
| Finalizar documento já concluído | Rejeitado; financeiro permanece único | Confirmado no ensaio de banco. |
| Cancelamento após recebimento | Pendência de reembolso, sem apagar original nem baixar caixa artificialmente | Confirmado no ensaio; confirmação de liquidação coberta pela suíte, sem transação real de reembolso nesta rodada. |
| Devolução de item fracionado | Campo anuncia três casas, parser aceita duas | Falha F07 reproduzida. |
| Reimpressão após alteração em outra sessão | Atalho usa snapshot local; Detalhes busca atual | Código; reprodução com duas sessões pendente. |

## 7. Proposta de UX/UI sem alterar o layout geral

| Área | Proposta | Benefício e impacto |
|---|---|---|
| Cabeçalho | Identificar “Nova”, “Em andamento”, “Orçamento”, “Condicional” e número/data reais quando houver | Evita tratar documento comercial e pagamento como a mesma etapa; ajuste localizado de rótulos. |
| Cliente/vendedor | Preservar seleção, mostrar condição de crédito e oferecer troca consciente de cliente | Menos surpresa e erros de associação; exige decisão sobre cliente de cartão. |
| Produto | Busca rápida, confirmação de código não encontrado, destaque da última inclusão e política explícita de preço repetido | Reduz erros com leitor; preserva estrutura atual da grade/tabela. |
| Edição numérica | Texto temporário durante digitação, normalização no blur/Enter e mensagens no campo | Evita que `toFixed`/`toLocaleString` a cada tecla impeçam apagar ou corrigir valores; validar no navegador. |
| Ajustes | Identificar modo “valor fixo”/“percentual” e atualizar a representação correspondente quando a base muda | Evita porcentagem e valor parecerem sincronizados quando a base mudou. |
| Pagamento | Resumo sempre visível com modalidade, valor, destino, crediário/compensação e total conferido | Menos cliques em dados já recolhidos e menos risco de conta herdada. |
| Finalização | Validar dados antes de abrir confirmação; exibir “Gravando — aguarde”, bloquear alteração do snapshot e recuperar resultado incerto | Evita confirmação que só depois revela campo obrigatório e evita perda de edição. |
| Em andamento | Mensagem inequívoca com número salvo e ação “Retomar”; comportamento próprio para troca | Confirma que saiu do editor e onde está o documento. |
| Comprovante | Manter abertura só da prévia e impressão manual; consultar documento atualizado na reimpressão | Requisito já atendido em grande parte; sem necessidade de redesenhar o modal novamente. |
| Erros | Uma mensagem por falha, recurso afetado, preservação de dados e nova tentativa local | Evita o estado “sem clientes” durante indisponibilidade. |
| Listagens | Busca e paginação por servidor; carregamento sob demanda; ações indisponíveis explicadas por permissão | Reduz espera e evita conduzir operador a ação que será negada no fim. |
| Histórico | Mostrar operador já registrado nos eventos, ação, momento e motivo; separar movimentação comercial da financeira | Maior rastreabilidade sem criar novo histórico duplicado. |
| Modais | Base acessível comum, foco/Escape consistentes e retorno ao campo anterior | Melhora rotina de teclado; manter bloqueios quando há envio em andamento. |
| Resoluções | Homologar 360/390px, tablet, 1366×768, 1920×1080 e zoom 125%/150%, com menu aberto/fechado | Corrigir cortes e rolagens somente após reprodução; não alterar layout geral por impressão subjetiva. |

## 8. Plano de implementação proposto — somente após aprovação

### Fase A — Cálculos e entradas de produto

- F01, F02, F03, F07, F08.
- Arquivos: `page.tsx`, `troca-modal.tsx`, utilitário numérico compartilhado e testes; backend somente se necessário para conciliar contrato de cotação/total esperado.
- Preservar `Decimal` e arredondamento por linha já usados no servidor. Não recalcular vendas antigas.
- **Risco de regressão:** médio/alto, por afetar totais, descontos, troco e quantidade. Mitigar com testes de fronteiras, parcelas e comparação com banco.
- **Aceite:** exemplos reproduzidos corrigidos; mesma regra no rascunho, conclusão, troca, comprovante e relatórios.

### Fase B — Ciclo de atendimento e recuperação

- F04, F05, F09, F10, F11, F16.
- Arquivos: tela principal, ações de andamento, gestão de rascunho e serviço de pedidos.
- Definir estado do atendimento, confirmação de descarte e resultado desconhecido. Separar navegação de reinicialização.
- **Risco:** médio/alto, por envolver retomada, concorrência e idempotência. Não enfraquecer controle de versão nem repetir POST automaticamente sem a mesma chave/snapshot.
- **Aceite:** resposta perdida não exige nova venda; recuperar não duplica; trocar tela não apaga sem aviso; Em Andamento não conclui troca.

### Fase C — Identidade, autorizações e fronteira do módulo

- F06, F12, F17 e decisões de desconto/estoque/cliente de cartão.
- Arquivos: tela/pagamento, DTO/validador de cartão, controllers/serviços relacionados e relatórios.
- **Risco:** alto de bloquear operação legítima se requisitos forem presumidos. Aprovar regras antes, manter exceções de documentos históricos e rascunhos incompletos.
- **Aceite:** simples/misto com associação de cliente coerente; campos obrigatórios garantidos no servidor; usuário fora do ramo não usa API exclusiva de Varejo; relatórios identificam origem dos títulos.

### Fase D — Desempenho, consistência de consultas e documentos

- F13, F14, F15, F20, F21.
- Arquivos: serviço frontend de pedidos, endpoints de listagem/detalhe, componentes de cadastros, recibo e bootstrap.
- **Risco:** médio, especialmente em filtros/exportação e fotos/eventos. Não transformar paginação de tela em exportação incompleta. Persistência adicional de troco/custo, se aprovada, exige desenho separado.
- **Aceite:** PDV abre sem baixar todo histórico; falha de pedidos não elimina catálogo; reimpressão busca versão atual; consultas não criam registros indevidamente.

### Fase E — UX e homologação final

- F18, F19; ajustes locais aprovados da seção 7.
- Atualizar fixture de grade/cliente no roteiro integrado, acrescentar casos novos e preservar rollback. Ensaiar injeção de falhas, repetição e duas sessões reais em ambiente isolado.
- **Risco:** baixo para rótulos/foco; médio para mudanças de navegação/estado. Executar regressão de PDV, condicional, devolução, caixa, créditos, cadastros e relatórios.
- **Aceite:** testes funcionais e visuais aprovados, nenhuma operação de origem alterada por consulta, todos os documentos/efeitos financeiros conciliados e roteiro completo passa sem contornar as proteções do backend.

## 9. Ordem de decisão recomendada

1. Corrigir precisão e preservação de preços: F01/F02/F03.
2. Impedir perda de atendimento e ambiguidade de Em Andamento: F04/F05/F10/F11.
3. Alinhar cliente de cartão, conta financeira e obrigatoriedade de metadados: F06/F09/F12, com regra aprovada.
4. Corrigir precisão da devolução e filtro de variações: F07/F08.
5. Atacar carga integral, atualização/reimpressão e estados de erro: F13/F14/F15/F16.
6. Completar fronteira da API, roteiro integrado e homologação de UX: F17/F18/F19/F20/F21.

**Resultado desta etapa:** diagnóstico entregue e plano pronto para aprovação. Não foram aplicadas correções, mudanças visuais, alterações de regras comerciais ou deploy.
