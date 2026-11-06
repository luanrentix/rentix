# Análise funcional do módulo Vendas

Data: 05/11/2026. Escopo: frontend, serviços HTTP, backend NestJS, DTOs, schema Prisma e migrações locais de Vendas. Análise do código disponível, sem alterar funcionalidades, executar migrações ou acessar produção. Não equivale a homologação no navegador nem comprova o estado do banco implantado. O protocolo geral das dez áreas não foi acionado.

## Parecer executivo

Existe uma base funcional de PDV e cadastros, mas o módulo ainda não está pronto para ser considerado um fluxo comercial e financeiro completo. Há um erro de TypeScript em Produtos, regras incompletas de crediário, pagamentos sem integração financeira, vínculo textual com fornecedor e falhas no ciclo de vida da venda.

## Vínculos existentes

| Integração | Implementação encontrada | Limitação |
|---|---|---|
| Venda → cliente | customerId com relação Prisma; cliente ativo da empresa validado no backend; nome preservado na venda | Limite, bloqueio e prazo de crédito não são aplicados ao concluir |
| Venda → vendedor | sellerId com relação Prisma e validação de vendedor ativo da empresa | Configurações de comissão não geram apuração |
| Venda → produto | productId nos itens JSON; validação de produto ativo da empresa; cópia de nome, código, unidade e preço | Não há relação relacional de cada item; não há escolha de variação |
| Produto → fornecedor | Seleção de fornecedor cadastrado na interface | Salva supplierName, sem supplierId ou chave estrangeira |
| Venda → pagamento | Dinheiro, Pix, débito, crédito, crediário e misto | Registro declaratório; sem confirmação de recebimento, parcelas ou conciliação |
| Venda → estoque | Baixa condicional com saldo suficiente em transação; reposição em cancelamento/estorno | Mesma regra para todos os tipos de operação concluída; sem livro de movimentações |
| Venda → financeiro | Não encontrada no fluxo de gravação | Não gera contas a receber, caixa ou movimentação bancária |

## Achados com evidências e impacto

### 1. Alta — erro de compilação em Produtos

`app/vendas/produtos-panel.tsx:65` acessa `SalesProduct.BRAND`, mas o contrato define `brand`. A verificação TypeScript apontou TS2551 duas vezes. Bloqueia a aprovação técnica do frontend e prejudica a lógica que usa a marca. Corrigir a propriedade e repetir a verificação.

### 2. Alta — crediário sem política de crédito

`contrx-backend/src/vendas/vendas.service.ts:615-636` valida o cliente e impede crediário para consumidor final, mas não consulta/aplica `creditBlocked`, `creditLimit` e `creditDays`. Esses campos existem em `schema.prisma`, no modelo SalesCustomer. Um cliente bloqueado ou sem limite continua elegível pelo fluxo de backend inspecionado. Falta definir saldo devedor, limite disponível, vencimento e tratamento do componente a prazo no pagamento misto.

### 3. Alta — pagamento não realiza a integração financeira

`vendas.service.ts:606-636` grava pedido e estoque, sem criar recebíveis ou transações financeiras. `vendas.module.ts` importa apenas PrismaModule. Não foram encontradas referências a SalesOrder nos serviços financeiros pesquisados. Pix/cartão indicam a forma informada pelo operador; não comprovam liquidação. Crediário não cria parcelas nem cobrança. O próprio painel de estornos informa que nenhuma conta financeira é alterada. Para completar o ERP, definir conta/caixa de destino, liquidação imediata ou futura, parcelas, taxas e reversão vinculada. Integração com adquirente/Pix depende do escopo comercial; o registro manual pode continuar existindo.

### 4. Alta — pagamento misto validado apenas superficialmente

`dto/criar-venda.dto.ts` exige somente objeto em `paymentDetails`. `buildOrderData` não confere métodos permitidos, números finitos, valores não negativos nem soma igual ao total. A interface confere soma, mas não valida individualmente todas as partes; NaN pode escapar da comparação e ser serializado como null. Falta validar tudo no servidor, com precisão monetária e nomes padronizados: pagamento simples usa CARTAO_DEBITO/CARTAO_CREDITO, enquanto partes usam DEBITO/CREDITO.

### 5. Alta — fornecedor sem vínculo persistente por ID

`app/vendas/produtos-panel.tsx:151` usa o nome como valor da seleção. `schema.prisma:154` define somente supplierName. Renomear ou arquivar o fornecedor não atualiza nem valida o vínculo do produto. Homônimos são ambíguos e a API pode receber um texto sem cadastro correspondente. Criar supplierId com validação da empresa; migrar nomes antigos com resolução explícita das ambiguidades, preservando o histórico das vendas.

### 6. Alta — orçamento, condicional, pedido e troca têm regra genérica de estoque

`vendas.service.ts:574,610` aplica baixa quando status é CONCLUIDA, independentemente de saleType. A interface permite concluir os cinco tipos. Assim, orçamento concluído também pode baixar estoque e entrar no total vendido. É necessário definir estados próprios: orçamento sem baixa, reserva/separação de pedido e condicional conforme regra da empresa, conversão em venda e encerramento.

Troca é apenas um tipo selecionável: os itens aceitam quantidade positiva e o fluxo só baixa estoque. Não há vínculo com venda original, entrada do produto devolvido, diferença a pagar ou crédito do cliente. Não deve ser homologada como troca completa.

### 7. Alta — Excluir Venda não cancela registro salvo

`app/vendas/page.tsx:302` chama clearSale. Existe deleteCurrentSale em `:225`, que chamaria cancelSalesOrder, mas não está ligada ao botão. Abrir uma venda em andamento e clicar em Excluir Venda limpa a tela e mantém o registro no banco. Ligar a ação correta e distinguir descarte de carrinho de cancelamento de documento salvo.

### 8. Alta — transições e concorrência incompletas

`updateOrder:566` bloqueia ESTORNADA, mas não CANCELADA, permitindo reativação via API. `reverseOrder:581` bloqueia somente ESTORNADA e aceita outros estados. Falta uma matriz de transições e restrição de edição após conclusão.

O controle concorrente usa status e stockApplied. Duas edições que mantenham ambos podem passar e sobrescrever dados; não existe versão/updatedAt do pedido usada nessa comparação. A transação protege o rollback das operações, mas não resolve essa condição. Adotar versão ou bloqueio e idempotência para evitar duplicidade por repetição da gravação. O atalho F9 chama saveSale sem verificar saving dentro da função.

### 9. Média — grades e comissões apenas cadastradas

Grade é texto em variations; a venda não recebe variantId nem controla saldo por tamanho/cor. inheritGridPrice não tem aplicação no cálculo dos itens inspecionado. As opções de comissão do produto e percentual do vendedor não são utilizadas em buildOrderData. Faltam apuração, base de cálculo, histórico e reversão. Para confecções, saldo apenas por produto não controla disponibilidade por tamanho.

### 10. Média — código sequencial do produto sujeito a colisão

`createProduct:323-327` gera SKU por quantidade de produtos + 1. Exemplo: códigos 1, 2 e 3; excluir o produto 2 deixa dois registros e o próximo código tentado é 3. O bloqueio da empresa serializa criações, mas não elimina a colisão após exclusão. Além disso, o SKU informado no cadastro rápido é ignorado nessa criação, e productData não aplica SKU recebido em edição. Definir se código será automático ou informado e usar contador persistente seguro.

### 11. Média — relatórios parciais e distribuição incompleta

`listOrders:557-559` retorna apenas 100 registros, sem paginação. Os relatórios da página somam somente essa lista, inclusive tipos que não representam venda efetiva se concluídos. Pagamento misto fica integralmente na categoria Misto, sem distribuir suas partes por método. Faltam filtros por período, cliente, vendedor e fornecedor, agregação no servidor e separação entre valor vendido, recebido e a receber.

### 12. Média — atualização de cadastros e mensagens

O painel Produtos recarrega sua própria lista, mas não notifica a lista products do PDV na página pai. Retornar ao PDV pode conservar produtos e preços anteriores até nova carga. Cadastros de clientes e vendedores têm alguns caminhos de atualização, mas erros de carregamento são capturados limpando listas sem mensagem específica. Centralizar a atualização após cadastros e apresentar falhas recuperáveis.

clearSale não limpa paymentParts; openOrder só substitui paymentParts quando existem detalhes, podendo manter valores de outra venda. O preço promocional é aplicado no frontend, mas o fallback do backend usa price normal quando unitPrice é omitido. Padronizar a regra comercial no servidor.

### 13. Média — rastreabilidade e precisão

Não há operador de criação/alteração ou histórico estruturado do pedido no modelo SalesOrder. Motivos de cancelamento/estorno são concatenados em notes. Estoque pode ser editado diretamente no produto, sem registro de ajuste encontrado no módulo. Faltam trilha de alterações e razão dos movimentos.

Quantidade do produto admite três casas no estoque, mas ItemVendaDto admite apenas duas. Produtos fracionáveis precisam de regra uniforme. Cálculos de linha podem gerar frações de centavo antes de gravar campos Decimal(10,2); definir arredondamento por linha e total para conciliar parcelas.

### 14. Pendências de homologação

Não foram encontrados testes específicos de Vendas em src/test pesquisados. Não foram executadas vendas reais nem validação de migrações aplicadas. Anexos utilizam /files com entidade OTHER; envio, download e exclusão precisam de teste integrado para cliente/produto. Não foi identificado no fluxo de PDV inspecionado fechamento de caixa com abertura, saldo, sangria e conferência; CAIXA reutiliza a tela do PDV. Comprovante, emissão fiscal e integrações externas devem ter escopo definido antes de chamar o fluxo de operação completa.

## Pontos positivos comprovados no código

- Controller usa autenticação JWT e permissão sales.
- Operações inspecionadas usam companyId do usuário e validam cliente, vendedor e produtos da empresa na montagem da venda.
- Backend recalcula subtotal/total com Decimal e impede desconto maior que subtotal.
- DTO exige itens e valida quantidade positiva e preço não negativo.
- Estoque gerenciado usa decremento condicionado ao saldo e transação; falhas revertem a operação.
- Cancelamento/estorno têm implementação de reposição do estoque aplicado.
- Cliente e vendedor preservam relação por ID e nomes históricos; produto com item em venda é protegido contra exclusão pelo serviço.
- Consumidor final é criado pelo módulo e impedido de comprar a prazo.
- Acesso é restrito ao ramo CONFECCOES pelo serviço; confirmar que essa é a regra comercial desejada.

## Validação técnica

Executadas verificações com TypeScript local, --noEmit --incremental false. A verificação do frontend detectou BRAND inexistente no produto. A verificação completa do backend detectou erros em testes existentes de admin, autenticação, contas a receber e contratos; esses erros não demonstram defeito do serviço Vendas. A verificação TypeScript do backend com tsconfig.build.json, que exclui specs, passou. Isso não equivale a executar npm run build, que também gera o cliente Prisma. Não foram executados deploy, commit, push, migrações ou alterações em dados.

## Ordem recomendada de implementação

1. Corrigir TypeScript, cancelamento da interface, transições e validação monetária no servidor. Baixo a médio risco; validar registros existentes.
2. Definir regras por tipo de operação, troca, edição de concluídas e crédito. Implementar concorrência e idempotência. Alto impacto comercial; homologar com cenários da empresa.
3. Criar relação produto-fornecedor e itens/variantes estruturados, preservando dados legados. Migrações aditivas e mapeamento revisável; não associar homônimos automaticamente.
4. Integrar recebíveis e caixa com vínculo ao pedido, parcelas, liquidação e estornos. Alto risco de duplicação financeira; definir como tratar vendas antigas antes de ativar geração automática.
5. Implementar razão de estoque, comissão, relatórios completos e comprovantes conforme escopo.
6. Homologar em banco de testes e navegador, executar builds e revisar migrações antes de entrega manual pelo usuário.

## Cenários mínimos de aceite

- Venda à vista de produto gerenciado: uma venda, uma baixa e um recebimento vinculado; repetição da requisição não duplica.
- Estoque insuficiente: nenhuma venda, baixa ou lançamento parcial persistido.
- Cliente bloqueado/limite excedido: rejeição também pela API; cliente de outra empresa rejeitado.
- Misto: rejeitar partes negativas, null, não numéricas, métodos desconhecidos e soma divergente; distribuir parcelas corretamente.
- Crediário: criar vencimentos e saldo devedor do cliente; pagamento e estorno atualizam saldo.
- Orçamento sem baixa; conversão baixa uma única vez; condicional tem entrega e retorno rastreáveis.
- Troca vinculada à original: entrada do devolvido, saída do novo e acerto da diferença.
- Cancelar venda em andamento pelo botão remove-a da lista ativa; cancelada/estornada não pode ser reativada por edição comum.
- Duas edições simultâneas: conflito explícito, sem sobrescrita silenciosa ou estoque duplicado.
- Renomear/arquivar fornecedor preserva o histórico e mantém o vínculo correto pelo ID.
- Produto novo/alterado aparece atualizado no PDV; código não colide após exclusão.
- Venda por tamanho/cor baixa somente a variante escolhida; comissão confere com regra e desconto.
- Mais de 100 vendas: paginação e relatórios por período incluem todo o conjunto esperado.
