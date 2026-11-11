const fs = require('node:fs');
const ts = require('typescript');
const assert = require('node:assert/strict');
const source = fs.readFileSync('app/vendas/sale-receipt-modal.tsx', 'utf8');
const ast = ts.createSourceFile('modal.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let printSource;
let authorizationSource;
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'print') printSource = node.getText(ast);
  if (ts.isCallExpression(node) && node.expression.getText(ast) === 'useEffect' && node.arguments[0]?.getText(ast).includes('authorizeAction(')) authorizationSource = node.arguments[0].getText(ast);
  ts.forEachChild(node, visit);
}
visit(ast);
assert.ok(printSource && authorizationSource);
function click(overrides = {}) {
  const events = [];
  const frame = { current: { contentWindow: { focus: () => events.push('focus'), print: () => events.push('print') } } };
  const run = new Function('printAuthorized', 'ready', 'quoteLoading', 'frame', 'setPrintError', printSource + '; print();');
  run(overrides.authorized ?? true, overrides.ready ?? true, overrides.loading ?? false, overrides.frame ?? frame, message => events.push(message));
  return events;
}
assert.deepEqual(click(), ['focus', 'print', '']);
assert.deepEqual(click({ authorized: false }), []);
assert.deepEqual(click({ ready: false }), []);
assert.deepEqual(click({ loading: true }), []);
assert.ok(click({ frame: { current: null } })[0].includes('não está pronto'));
assert.ok(!printSource.includes('await') && !printSource.includes('authorizeAction'));
async function authorization(result) {
  const state = {};
  const effect = new Function('authorizeAction', 'setPrintAuthorized', 'setAuthorizingPrint', 'setAuthorizationError', 'return (' + authorizationSource + ');')(
    async () => result,
    value => { state.allowed = value; },
    value => { state.loading = value; },
    value => { state.error = value; },
  );
  effect();
  await new Promise(resolve => setImmediate(resolve));
  return state;
}
(async () => {
  assert.deepEqual(await authorization({ allowed: true }), { allowed: true, loading: false, error: '' });
  const denied = await authorization({ allowed: false });
  assert.equal(denied.allowed, false);
  assert.equal(denied.loading, false);
  assert.ok(denied.error.includes('sem permissão'));
  console.log('APROVADO: impressão síncrona no clique, autorização prévia, bloqueios e erro visível.');
})().catch(error => { console.error(error); process.exitCode = 1; });
