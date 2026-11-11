const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
const loaded = { exports: {} };
const calls = [];
let response = { companyId: 'empresa-a', companySettings: { ramoAtividade: 'CONFECCOES' }, themeSettings: { mode: 'light' } };
const requireLocal = (path) => path === './api'
  ? { apiFetch: async (...args) => { calls.push(args); return response; } }
  : { uppercaseRecordFields: (value) => value };
new Function('require', 'module', 'exports', ts.transpileModule(fs.readFileSync('services/settings.service.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText)(requireLocal, loaded, loaded.exports);
(async () => {
  const result = await loaded.exports.getAppRuntimeSettings('empresa-a');
  assert.equal(calls[0][0], '/settings/runtime');
  assert.equal(result.companySettings.ramoAtividade, 'CONFECCOES');
  assert.equal(result.userSettings, undefined);
  assert.equal(result.printTemplates, undefined);
  response = { ...response, companyId: 'empresa-b' };
  await assert.rejects(() => loaded.exports.getAppRuntimeSettings('empresa-a'), /outra empresa/);
  console.log('APROVADO: inicialização usa rota própria e rejeita empresa divergente.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
