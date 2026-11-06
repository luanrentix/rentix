const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const testModule = { exports: {} };
new Function('module', 'exports', ts.transpileModule(fs.readFileSync('services/sales-receipt.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(testModule, testModule.exports);
const { buildSalesReceipt } = testModule.exports;
const order = { number: 42, saleType: 'VENDA', status: 'CONCLUIDA', customerName: 'CLIENTE DO TESTE', sellerName: 'VENDEDOR DO TESTE', createdAt: '2026-11-05T15:00:00Z', completedAt: '2026-11-05T15:01:00Z', items: [{ sku: 'SKU1', name: 'CAMISA', variantName: 'AZUL / M', quantity: 2, unitPrice: '50', subtotal: '100' }], subtotal: 100, discount: 5, addition: 5, total: 100, paymentMethod: 'MISTO', paymentDetails: { DINHEIRO: 50, PIX: 25, CREDIARIO: 25, SALDO_CLIENTE: 0 }, installments: 3, notes: 'Obrigada pela preferência!' };
const receipt = buildSalesReceipt(order, { tradeName: 'LOJA DO TESTE', document: 'DOCUMENTO' }, '100,00');
for (const value of ['#42', 'LOJA DO TESTE', 'CLIENTE DO TESTE', 'VENDEDOR DO TESTE', 'CAMISA', 'AZUL / M', 'NÃO FISCAL', 'Dinheiro', 'Pix', 'Crediário (a receber)', '3 parcela(s)', 'Troco:', 'Observações']) assert.ok(receipt.includes(value), value);
assert.ok(!receipt.includes('Crédito do cliente:'));
const injection = buildSalesReceipt({ ...order, customerName: '<script>alert(1)</script>', notes: '<img src=x onerror=alert(1)>' }, { tradeName: '<iframe src=x>' });
assert.ok(!injection.includes('<script>'));
assert.ok(!injection.includes('<img src=x'));
assert.ok(!injection.includes('<iframe src=x'));
assert.ok(injection.includes('&lt;script&gt;'));
for (const type of ['PEDIDO', 'CONDICIONAL', 'ORCAMENTO']) {
  const doc = buildSalesReceipt({ ...order, saleType: type });
  assert.ok(doc.includes('não comprova recebimento'));
  assert.ok(!doc.includes('<h3>Forma de pagamento'));
}
const cash = buildSalesReceipt({ ...order, paymentMethod: 'DINHEIRO', paymentDetails: null, total: 1200 }, {}, '1.500,00');
assert.ok(cash.includes('Troco:'));
assert.ok(cash.includes('300,00'));
assert.ok(buildSalesReceipt({ ...order, total: -50, saleType: 'TROCA', returnDisposition: 'CREDIT' }).includes('Diferença lançada como crédito'));
console.log('APROVADO: recibo com dados da venda, pagamentos, troco, documentos sem recebimento e escape de conteúdo.');
