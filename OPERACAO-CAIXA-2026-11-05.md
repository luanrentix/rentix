# Operação de caixa

Acesso: **Caixa > Operação de caixa** (`/vendas?view=CAIXA`).

## Funcionalidades

- Histórico integrado às movimentações financeiras confirmadas, sem gerar outro recebimento para a mesma venda.
- Vendas e parcelas recebidas por dinheiro, Pix, débito, crédito e demais formas; pagamentos mistos separados.
- Devoluções e estornos apresentados como movimentos de sentido contrário, preservando os originais.
- Suprimento e sangria em conta do tipo Caixa, com motivo obrigatório, operador, data e hora.
- Criação da conta CAIXA LOJA na primeira entrada, caso não exista caixa ativo.
- Saldo físico separado dos pagamentos eletrônicos, inclusive quando compartilham uma conta financeira de destino. Considera o saldo inicial cadastrado e as movimentações identificadas como dinheiro.
- Bloqueio de sangria acima do dinheiro disponível; repetição do mesmo envio não duplica o lançamento.
- Filtros de período, conta e forma; busca por venda, cliente, motivo e operador; histórico paginado e exportação CSV.
- Movimentações de caixa protegidas contra exclusão pelo módulo Bancos. Correções são novas operações de sentido contrário, com justificativa.

Crediário entra na movimentação quando a parcela é recebida. Crédito de cliente é compensação e não entrada de dinheiro. As operações seguem a permissão de Vendas e o isolamento da empresa autenticada.

## Persistência e histórico

Reutiliza `BankTransaction`, `BankAccount` e `CommercialHistory`; não exige nova migração. Suprimentos e sangrias atualizam o financeiro e o histórico na mesma transação. Novos recebimentos de parcelas guardam a identificação da forma e da divisão para manter precisão mesmo com pagamentos de mesmo valor e data. Registros anteriores usam a identificação existente na venda e nos pagamentos associados.

O histórico mostra movimentações confirmadas existentes no financeiro. Documentos antigos sem lançamento financeiro não são presumidos como recebidos. Identificação do operador é registrada nos novos suprimentos e sangrias; movimentos históricos sem essa informação exibem “—”.

## Validação local

- Build do frontend e do backend; verificação TypeScript do frontend.
- Suíte de 74 testes de vendas, consultas, DTOs e integração financeira.
- `contrx-backend/scripts/validate-sales-flow-local.js`: valida em PostgreSQL local, dentro de transação revertida ao terminar, suprimento, sangria, idempotência, falta de saldo, separação de dinheiro/Pix, parcelas do mesmo valor e data, recebimento misto, estornos, reembolso e isolamento entre empresas, além dos fluxos anteriores de vendas.

Nenhum commit, push ou deploy automático. A publicação permanece manual.
