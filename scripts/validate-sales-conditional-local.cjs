const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const loaded = { exports: {} };
const numbersModule = { exports: {} };
new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync('services/sales-numbers.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(numbersModule, numbersModule.exports);
const receiptRequire = name => { if (name === './sales-numbers') return numbersModule.exports; throw new Error(name); };
new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync('services/sales-receipt.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(loaded, loaded.exports, receiptRequire);
const order = { number: 49, saleType: 'CONDICIONAL', status: 'CONCLUIDA', customerName: 'CLIENTE EXEMPLO', sellerName: 'VENDEDORA EXEMPLO', createdAt: '2026-11-09T14:00:00Z', customer: { address: 'RUA EXEMPLO', number: '100', city: 'ROLIM DE MOURA', state: 'RO', phone: '(69) 3000-0000' }, items: Array.from({ length: 6 }, (_, index) => ({ sku: String(index + 1184), barcode: '789123456700' + index, name: index === 0 ? 'CAMISOLA DE ALGODÃO COM RENDA E ALÇAS AJUSTÁVEIS' : 'PIJAMA DE ALGODÃO', variantName: 'AZUL / M', unit: 'UN', quantity: 2, unitPrice: '99.99', subtotal: '199.98' })), subtotal: '1199.88', discount: '99.88', addition: 0, total: '1100', paymentMethod: 'DINHEIRO', notes: 'Conferir os produtos no retorno.' };
const company = { tradeName: 'LOJA EXEMPLO', address: 'AVENIDA EXEMPLO', number: '100', neighborhood: 'CENTRO', city: 'ROLIM DE MOURA', state: 'RO', phone: '(69) 3000-0000' };
const html = loaded.exports.buildSalesReceipt(order, company);
assert.ok(!html.includes('PESO') && !html.includes('Peso') && !html.includes('class="weight"'));
const promotionOrder = {
  ...order,
  customer: { ...order.customer, name: 'CLIENTE COMPLETO', phone: '(69) 3000-0000', phone2: '(69) 99999-9999', email: 'cliente@example.test' },
  items: [
    { ...order.items[0], quantity: 1, priceType: 'NORMAL', originalUnitPrice: '100', baseUnitPrice: '100', unitPrice: '100', subtotal: '100' },
    { ...order.items[1], quantity: 1, priceType: 'PROMOCIONAL', originalUnitPrice: '100', baseUnitPrice: '80', unitPrice: '80', subtotal: '80' },
  ],
  subtotal: '180', discount: '10', total: '170',
};
const promotional = loaded.exports.buildSalesReceipt(promotionOrder, company);
for (const expected of ['CLIENTE COMPLETO', '(69) 99999-9999', 'cliente@example.test', 'original">100,00', '80,00<small>Promoção</small>', '>90,00</td>', '>80,00</td>', '>10,00</td>']) assert.ok(promotional.includes(expected), expected);
const fractional = loaded.exports.buildSalesReceipt({ ...order, items: [{ ...order.items[0], quantity: 0.5, originalUnitPrice: '0.02', baseUnitPrice: '0.02', discount: '0.01', unitPrice: '0.01', subtotal: '0.01' }], subtotal: '0.01', discount: 0, total: '0.01' }, company);
assert.ok(fractional.includes('0,500'));
for (const value of ['Condicional', 'REF.', 'Cód. barras', 'QTDE', 'ORIGINAL', 'DESC.', 'Total de itens:', '24 Horas', 'AUTORIZAÇÃO DO CLIENTE', '7891234567000', '1.100,00', 'RUA EXEMPLO', 'DOCUMENTO NÃO FISCAL']) assert.ok(html.includes(value), value);
assert.ok(!html.includes('Forma de pagamento') && !html.includes('Troco:'));
const safe = loaded.exports.buildSalesReceipt({ ...order, customerName: '<script>x</script>', notes: '<img src=x onerror=x>', items: [{ ...order.items[0], barcode: '<iframe>' }] }, { tradeName: '<svg>' });
assert.ok(!safe.includes('<script>') && !safe.includes('<img src=x') && !safe.includes('<iframe>') && !safe.includes('<svg>'));
assert.ok(safe.includes('&lt;script&gt;'));
assert.ok(loaded.exports.buildSalesReceipt({ ...order, customer: null, items: [{ ...order.items[0], barcode: undefined, unit: undefined }] }, {}).includes('Endereço não informado'));
if (process.argv.includes('--preview')) {
  fs.mkdirSync('tmp/pdfs', { recursive: true });
  fs.writeFileSync('tmp/pdfs/condicional-modelo.html', html);
  fs.writeFileSync('tmp/pdfs/condicional-promocao.html', promotional);
  fs.writeFileSync('tmp/pdfs/condicional-longo.html', loaded.exports.buildSalesReceipt({ ...order, items: Array.from({ length: 100 }, (_, index) => ({ ...order.items[index % 6], name: 'PRODUTO COM DESCRIÇÃO LONGA PARA CONFERÊNCIA DA PAGINAÇÃO', sku: String(index + 1) })) }, company));
}
console.log('APROVADO: condicional, dados do cliente, itens, termos impressos, ausência de recebimento e escape.');
