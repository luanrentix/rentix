const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.resolve(__dirname, '../app/vendas/produtos-panel.tsx'), 'utf8');
const ast = ts.createSourceFile('products.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
const required = new Set(['parseMoney', 'roundToTwo', 'empty', 'updateSalePrice', 'updateMarkup', 'updateCost', 'updateProfitMargin']);
const parts = [];
function visit(node) {
  if ((ts.isFunctionDeclaration(node) || ts.isVariableDeclaration(node)) && node.name && required.has(node.name.getText(ast))) {
    parts.push(ts.isVariableDeclaration(node) ? `const ${node.getText(ast)};` : node.getText(ast));
    required.delete(node.name.getText(ast));
  }
  ts.forEachChild(node, visit);
}
visit(ast);
assert.equal(required.size, 0);
let form;
const context = vm.createContext({ setForm: update => { form = update(form); } });
vm.runInContext(ts.transpileModule(parts.join('\n'), { compilerOptions: { target: ts.ScriptTarget.ES2020 } }).outputText, context);
form = vm.runInContext('({...empty})', context);
for (const key of ['purchaseCost', 'additionalCost', 'price', 'markupMultiplier']) assert.equal(form[key], '');
context.updateCost('purchaseCost', '100,00');
assert.equal(form.price, 100);
context.updateProfitMargin('25');
assert.equal(form.price, 133.33);
context.updateSalePrice('200,00');
assert.equal(form.markupMultiplier, 2);
context.updateMarkup('3');
assert.equal(form.price, 300);
context.updateCost('additionalCost', '20,00');
assert.equal(form.price, 360);
context.updateCost('additionalCost', '');
assert.equal(form.additionalCost, '');
context.updateSalePrice('');
assert.equal(form.price, '');
console.log('PASS: precos inicialmente vazios, margem de 25%, sincronizacao de custo/venda/markup e limpeza de campos.');
