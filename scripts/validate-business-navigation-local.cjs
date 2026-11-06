const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

function loadSource(path) {
  const sourceModule = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(path, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  new Function('module', 'exports', code)(sourceModule, sourceModule.exports);
  return sourceModule.exports;
}

const { isBusinessRouteAllowed } = loadSource('services/business-navigation.ts');
for (const path of ['/confeccoes', '/vendas', '/configuracoes', '/suporte']) {
  assert.equal(isBusinessRouteAllowed(path, 'CONFECCOES'), true, path);
}
for (const path of ['/dashboard', '/agenda', '/imoveis', '/pessoas', '/contratos', '/financeiro', '/financeiro/relatorios', '/contas-receber', '/contas-pagar', '/bancos']) {
  assert.equal(isBusinessRouteAllowed(path, 'CONFECCOES'), false, path);
  assert.equal(isBusinessRouteAllowed(path, 'OUTRO'), true, path);
}
for (const path of ['/confeccoes', '/vendas']) {
  assert.equal(isBusinessRouteAllowed(path, 'OUTRO'), false, path);
}
const cache = loadSource('services/settings-cache.ts');
cache.setCachedAppSettings({ companyId: 'loja', companySettings: { ramoAtividade: 'CONFECCOES' } });
assert.equal(cache.getCachedCompanySettings('loja').ramoAtividade, 'CONFECCOES');
assert.equal(cache.getCachedCompanySettings('outra'), null);
cache.setCachedAppSettings({ themeSettings: { mode: 'light' } });
assert.equal(cache.getCachedCompanySettings('loja').ramoAtividade, 'CONFECCOES');
cache.setCachedAppSettings({ companyId: 'outra', companySettings: { ramoAtividade: 'OUTRO' } });
assert.equal(cache.getCachedCompanySettings('loja'), null);
assert.equal(cache.getCachedCompanySettings('outra').ramoAtividade, 'OUTRO');
const routes = loadSource('services/app-routes.ts');
assert.equal(routes.isInternalRoute('/confeccoes'), true);
assert.equal(routes.isInternalRoute('/inicio'), true);
assert.equal(routes.toolKeyByHref['/confeccoes'], 'sales');
console.log('APROVADO: navegação separada por ramo, rotas internas e cache por empresa.');
