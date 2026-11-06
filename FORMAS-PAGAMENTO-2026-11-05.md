# Revisão das formas de pagamento de Vendas

- Dinheiro: valor entregue e cálculo de troco; somente o valor da venda entra no financeiro.
- Pix: confirmação manual do recebimento antes de gravar.
- Débito e crédito: confirmação na maquininha; parcelamento da operadora permanece externo ao sistema. O recebimento financeiro segue o registro manual da venda.
- Pagamento misto: nomes legíveis, valores em reais, saldo a distribuir, excesso, botão para completar o restante e limpeza da divisão. Validação exata em centavos.
- Crediário: exige cliente identificado, liberado, com limite e prazo; prévia de vencimentos e divisão exata dos centavos. O backend considera as dívidas existentes e impede exceder o limite disponível.
- Crédito do cliente: mostra saldo, consumo e previsão do saldo restante; compensação sem inflar as entradas do caixa.
- Conta de recebimento aparece somente para valores recebidos agora. Na ausência de contas, permite criar CAIXA LOJA com saldo zero, sem gerar entrada fictícia. Criação serializada e reutilizável por empresa.
- Orçamentos, pedidos e condicionais mostram quando o pagamento será definido; não geram recebimento. Pagamento misto parcial pode ser salvo em andamento e deve fechar o total ao concluir a venda.
- Trocas utilizam as mesmas validações na cobrança da diferença; reembolso continua limitado a dinheiro, Pix e cartões. Corrigida a exibição de acentos no modal.

## Validações

`node scripts/validate-sales-payments-local.cjs`: formas individuais, misto, valores inválidos, divergências de um centavo, dinheiro entregue, conta, regras de crédito e parcelas.

No backend: 74 testes de vendas/financeiro e `node scripts/validate-sales-flow-local.js` em PostgreSQL local com rollback, ampliado com dinheiro, Pix, débito, crédito, misto em andamento/conversão e criação de caixa sem duplicação.

Sem migração, commit, push ou deploy. Backend local reiniciado para carregar as alterações.
