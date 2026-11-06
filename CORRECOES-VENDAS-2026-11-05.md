# Correções e evolução funcional de Vendas

Data: 05/11/2026. Implementação local autorizada após a análise funcional. As duas migrações foram aplicadas exclusivamente no PostgreSQL local `127.0.0.1:55432/contrx`, após simulação com rollback e backup. Não houve commit, push ou publicação em produção.

## Comportamento implementado

- Cliente, vendedor e produto continuam validados na empresa autenticada. Produto passa a ter fornecedor por ID e relação composta com a empresa; nomes antigos sem ambiguidade são associados pela migração.
- O condicional reserva estoque físico e, quando selecionada, a variação. Ao reabrir, retirar itens e mudar para Venda, o mesmo documento libera toda a reserva anterior e baixa apenas os itens mantidos. Para devolver tudo, cancelar o condicional libera as reservas. Não há recebimento financeiro enquanto o documento continuar condicional.
- Orçamento e pedido não baixam nem reservam estoque. Podem ser reabertos e convertidos em venda.
- Grade tem estoque, reserva, código de barras e preço opcional por variação. Estoque antigo não é distribuído automaticamente. O cadastro informa o saldo ainda não distribuído. O PDV permite escolher tamanho/cor e procurar pelo código de barras da variação.
- Pagamento misto é normalizado e validado no servidor: métodos conhecidos, números finitos, valores não negativos, centavos e soma exata.
- Crediário valida bloqueio, prazo, limite e saldo devedor, incluindo parcelas parcialmente recebidas. Parcelamento distribui centavos sem perder valor.
- Recebimentos manuais à vista geram recebível quitado, pagamento e entrada na conta/caixa selecionado. Crediário gera recebíveis pendentes; o recebimento posterior exige conta válida.
- Troca/devolução seleciona venda original e quantidades ainda disponíveis para devolver, inclusive variação. Valores consideram desconto/acréscimo da origem e limite de arredondamento do total original.
- Parcelas abertas da origem são abatidas antes de disponibilizar saldo ao cliente. O modal mostra esse abatimento. Havendo diferença positiva, ela é um novo pagamento, com escolha de forma, composição mista e crediário. Havendo saldo para o cliente, o operador escolhe reembolso ou crédito.
- Reembolso gera saída bancária e conta a pagar quitada. Crédito gera saldo do cliente e obrigação pendente; sua utilização em outra compra baixa esse saldo e a obrigação, sem simular entrada bancária. Ambos são rastreados.
- Estorno preserva recebimentos e movimentos anteriores, registra compensações bancárias, cancela os títulos vinculados e repõe estoque/reservas. Trocas ligadas devem ser estornadas antes da origem; crédito já utilizado exige desfazer a utilização antes de estornar sua concessão.
- Títulos e movimentos gerados por Vendas são protegidos contra alterações/exclusões avulsas nos módulos financeiros.
- Gravação tem chave de repetição e comparação do conteúdo. Repetir a requisição não duplica venda/estoque/financeiro. Edição usa versão; produto usa a data de atualização para evitar sobrescrever estoque/preços de um cadastro antigo.
- O botão Excluir Venda cancela o documento salvo. O cancelamento continua acessível quando todos os itens foram retirados do carrinho.
- Comissão é calculada e preservada nos itens; devoluções descontam a comissão proporcional. Relatórios distinguem o valor líquido vendido da diferença financeira e do abatimento de dívida.
- Histórico é carregado por páginas, sem o limite silencioso de 100 registros. Relatórios possuem filtros de período, cliente, vendedor e fornecedor. Pagamentos mistos são distribuídos entre suas formas.
- Conversão de condicional registra a data efetiva de conclusão, mantendo a data original de criação do documento.
- Eventos da venda e movimentos de estoque são registrados. Códigos de produto usam o maior código numérico existente, evitando a colisão causada por contagem após exclusões.

## Migrações preparadas

1. `contrx-backend/prisma/migrations/20261105120000_sales_integrity_and_financial_links/migration.sql`
2. `contrx-backend/prisma/migrations/20261105130000_sales_variants_returns_and_customer_credit/migration.sql`

Ambas foram aplicadas no ambiente local. Nos outros ambientes são necessárias junto com o código novo, por execução manual do usuário. A primeira transforma baixas dos condicionais antigos concluídos em reservas; a segunda cria variações com saldo zero e mantém o estoque físico no produto para distribuição manual. Nomes de fornecedor ambíguos permanecem sem associação automática. Não há geração retroativa de recebimentos nem movimentação bancária para vendas antigas.

## Limites e homologação

- Testes unitários e de contratos HTTP usam dados simulados. Também foram executadas a simulação das migrações e uma validação do fluxo completo no PostgreSQL local real, com rollback dos dados do teste. Ainda falta a homologação visual no navegador com os cadastros da empresa.
- Não houve acesso ou alteração de dados no Supabase/VPS. O estado do banco implantado não foi confirmado.
- Vendas antigas sem vínculos financeiros precisam de conciliação antes de operar devoluções: a ausência de títulos vinculados não comprova pagamento. Conferir especialmente operações antigas no crediário antes da liberação operacional.
- Recebimento é informado pelo operador. Não foi adicionada integração com adquirentes de cartão, confirmação bancária automática de Pix, emissão fiscal ou sessão de abertura/fechamento de caixa.

## Roteiro de homologação

1. No local, as migrações já estão aplicadas e o schema foi confirmado como atualizado. Nos demais ambientes, aplicar manualmente após a homologação e conferir fornecedores não associados.
2. Distribuir o estoque físico das grades manualmente. Confirmar estoque total, por variação, reservado e disponível.
3. Criar condicional com duas variações. Confirmar reserva; reabrir, retirar um item, converter em venda e conferir a liberação e a baixa no mesmo documento.
4. Vender à vista, em misto, no crediário e com crédito da loja. Conferir saldo de banco, recebíveis e obrigações de crédito.
5. Fazer devolução parcial com reembolso, outra com crédito e uma troca com diferença paga. Conferir títulos, conta/caixa, quantidades e comissão.
6. Conferir abatimento de parcelas em aberto e devoluções sucessivas com desconto e centavos.
7. Estornar as operações na ordem inversa e conferir reposição, cancelamento dos títulos e compensações bancárias.
8. Repetir gravação e tentar editar documento/cadastro desatualizado; confirmar ausência de duplicidade e mensagem de conflito.

## Validações locais

- 59 testes aprovados, em cinco suítes: regras de Vendas, contratos HTTP/DTOs, Contas a Receber, Contas a Pagar e Financeiro.
- Build do backend aprovado, incluindo geração do cliente Prisma e compilação NestJS.
- Verificação de diferenças dos arquivos rastreados sem erros de whitespace.
- Build do frontend aprovado, incluindo TypeScript e geração das páginas.
- As duas migrações foram simuladas em transação com rollback antes da aplicação local. O estoque disponível foi preservado. Foi salvo backup das tabelas alteradas em `contrx-backend/backups/vendas/`, pasta ignorada pelo Git.
- Migrações aplicadas somente no banco local; `prisma migrate status` confirmou o schema atualizado.
- Validação transacional no PostgreSQL real aprovada: fornecedor por ID, estoque por variação, reserva e conversão do mesmo condicional, pagamento misto, abatimento de dívida, concessão/uso de crédito, reembolso e estornos. Os dados criados pelo teste foram revertidos.

## Ajuste posterior: consulta de CNPJ

Na consulta do CNPJ mostrado pelo usuário, o teste de rede retornou HTTP 403 na BrasilAPI e HTTP 200 com cadastro válido no Minha Receita. O backend agora tenta o provedor alternativo automaticamente, rejeita respostas incompletas ou de outro documento e diferencia indisponibilidade de cadastro não encontrado em ambos os provedores. Se os serviços falharem, orienta o preenchimento manual sem impedir a gravação do cliente. As mensagens com acentuação corrompida no serviço de Vendas foram corrigidas.

Após esse ajuste: 74 testes aprovados em seis suítes e build do backend aprovado. Nenhuma migração ou alteração de dados foi necessária para essa correção.
