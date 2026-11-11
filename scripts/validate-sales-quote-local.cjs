const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const loaded = { exports: {} };
const numbersModule = { exports: {} };
new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync('services/sales-numbers.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(numbersModule, numbersModule.exports);
const receiptRequire = name => { if (name === './sales-numbers') return numbersModule.exports; throw new Error(name); };
new Function('module', 'exports', 'require', ts.transpileModule(fs.readFileSync('services/sales-receipt.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText)(loaded, loaded.exports, receiptRequire);
const { buildSalesReceipt } = loaded.exports;
const order = { id: 'preview', number: 5620, saleType: 'ORCAMENTO', status: 'CONCLUIDA', customerName: 'CLIENTE EXEMPLO', sellerName: 'VENDEDORA EXEMPLO', createdAt: '2026-11-09T14:00:00Z', customer: { address: 'AVENIDA EXEMPLO', number: '100', neighborhood: 'CENTRO', city: 'ROLIM DE MOURA', state: 'RO', zipCode: '76940-000', phone: '(69) 3000-0000' }, items: [
  { sku: '112', name: 'PRODUTO DE EXEMPLO 100ML (LINHA ESPECIAL)', brand: 'MARCA A', quantity: 1, unitPrice: '39.15', subtotal: '39.15' },
  { sku: '110', name: 'PRODUTO DE EXEMPLO 60ML', brand: 'MARCA B', quantity: 1, unitPrice: '117.45', subtotal: '117.45' },
  { sku: '111', name: 'PRODUTO DE EXEMPLO 250ML', brand: 'MARCA A', quantity: 1, unitPrice: '321.21', subtotal: '321.21' },
], subtotal: '477.81', discount: 0, addition: 0, total: '477.81', paymentMethod: 'DINHEIRO' };
const company = { tradeName: 'EMPRESA EXEMPLO', document: '00.000.000/0001-00', stateRegistration: '000000000', address: 'AVENIDA EXEMPLO', number: '100', neighborhood: 'CENTRO', city: 'ROLIM DE MOURA', state: 'RO', phone: '(69) 3000-0000', logo: 'data:image/png;base64,' + fs.readFileSync('public/logo-contrx.png').toString('base64') };
const options = { validUntil: '2026-11-24', deliveryAddress: 'AVENIDA EXEMPLO, 100, CENTRO, ROLIM DE MOURA - RO' };
const html = buildSalesReceipt(order, company, '', options);
for (const expected of ['Orçamento', 'NÃO TEM VALOR FISCAL', 'Inscr. Est.', 'Cliente:', 'Endereço:', 'Entrega:', 'Vendedor:', 'Válido até:', '24/11/2026', 'Quant.', 'Produto/Marca', 'MARCA A', 'Sub-total', '477,81', 'EXIJA O CUPOM FISCAL', 'size:A4']) assert.ok(html.includes(expected), expected);
assert.ok(!html.includes('Troco:'));
assert.ok(!html.includes('<h3>Forma de pagamento'));
const safe = buildSalesReceipt({ ...order, customerName: '<script>x</script>', notes: '<img src=x onerror=x>', items: [{ ...order.items[0], brand: '<svg onload=x>' }] }, { logo: 'javascript:alert(1)' }, '', { deliveryAddress: '<iframe src=x>' });
assert.ok(!safe.includes('<script>') && !safe.includes('<img src=x') && !safe.includes('<svg onload') && !safe.includes('<iframe src=x') && !safe.includes('src="javascript:'));
assert.ok(safe.includes('&lt;script&gt;'));
assert.ok(buildSalesReceipt(order, {}, '', {}).includes('Válido até:</b> —'));
if (process.argv.includes('--preview')) {
  fs.mkdirSync('tmp/pdfs', { recursive: true });
  fs.writeFileSync('tmp/pdfs/orcamento-modelo.html', html);
  fs.writeFileSync('tmp/pdfs/orcamento-longo.html', buildSalesReceipt({ ...order, items: Array.from({ length: 95 }, (_, index) => ({ ...order.items[index % 3], sku: String(index + 1), name: 'PRODUTO COM DESCRIÇÃO LONGA PARA CONFERIR QUEBRA DE LINHA E PAGINAÇÃO DO ORÇAMENTO', quantity: 0.125, subtotal: '4.89' })), subtotal: '464.55', total: '464.55' }, company, '', options));
}
console.log('APROVADO: orçamento A4, dados reais, opções de impressão, valores e escaping.');
