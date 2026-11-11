export const managementReports = [
  ['sellers', 'Vendas por vendedor', 'Vendas', 'sales'],
  ['sales-detail', 'Vendas detalhadas', 'Vendas', 'sales'],
  ['sales-period', 'Vendas por período', 'Vendas', 'sales'],
  ['products', 'Produtos vendidos', 'Vendas', 'sales'],
  ['top-products', 'Produtos mais vendidos', 'Vendas', 'sales'],
  ['abc', 'Curva ABC de vendas', 'Vendas', 'sales'],
  ['methods', 'Vendas por forma de pagamento', 'Vendas', 'sales'],
  ['customers', 'Vendas por cliente', 'Vendas', 'sales'],
  ['cancelled', 'Vendas canceladas e estornadas', 'Vendas', 'sales'],
  ['stock', 'Posição atual do estoque', 'Estoque', 'sales'],
  ['stock-minimum', 'Produtos com estoque mínimo', 'Estoque', 'sales'],
  ['stock-negative', 'Produtos com estoque negativo', 'Estoque', 'sales'],
  ['stock-value', 'Valorização do estoque', 'Estoque', 'sales'],
  ['stock-movements', 'Movimentação de estoque', 'Estoque', 'sales'],
  ['stock-balance', 'Balanço de estoque', 'Estoque', 'sales'],
  ['stock-inactive', 'Produtos sem movimentação', 'Estoque', 'sales'],
  ['receivables', 'Contas a receber', 'Financeiros', 'accountsReceivable'],
  ['payables', 'Contas a pagar', 'Financeiros', 'accountsPayable'],
  ['overdue', 'Inadimplência', 'Financeiros', 'accountsReceivable'],
  ['receipts', 'Recebimentos por período', 'Financeiros', 'accountsReceivable'],
  ['payments', 'Pagamentos por período', 'Financeiros', 'accountsPayable'],
  [
    'expenses-category',
    'Despesas por categoria',
    'Financeiros',
    'accountsPayable',
  ],
  ['trial-balance', 'Balancete financeiro gerencial', 'Financeiros', 'bank'],
  ['cash-flow', 'Fluxo de caixa realizado', 'Financeiros', 'bank'],
  ['projected-flow', 'Fluxo de caixa projetado', 'Financeiros', 'bank'],
  [
    'revenue-category',
    'Receitas por categoria bancária',
    'Financeiros',
    'bank',
  ],
  [
    'financial-indicators',
    'Indicadores financeiros bancários',
    'Gerenciais',
    'bank',
  ],
  ['summary', 'Resumo gerencial de vendas', 'Gerenciais', 'sales'],
  ['commercial-performance', 'Desempenho de vendedores', 'Gerenciais', 'sales'],
  ['revenue-evolution', 'Evolução do faturamento', 'Gerenciais', 'sales'],
  ['comparison', 'Comparativo de períodos', 'Gerenciais', 'sales'],
  ['partial-dre', 'DRE gerencial parcial', 'Gerenciais', 'sales'],
  ['quotes', 'Orçamentos', 'Operacionais', 'sales'],
  ['conditional', 'Condicionais', 'Operacionais', 'sales'],
  ['active', 'Vendas em andamento', 'Operacionais', 'sales'],
  ['credits', 'Créditos de clientes', 'Operacionais', 'sales'],
] as const;
export type ReportRow = (string | number | null)[];
export type ReportTable = {
  columns: string[];
  rows: ReportRow[];
  totals?: Record<string, string>;
  warnings?: string[];
};
