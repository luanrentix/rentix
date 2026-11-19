const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

const exportsApi = {};
let token = 'old-token';
let events = 0;
const pending = [];
vm.runInNewContext(ts.transpileModule(fs.readFileSync('services/api.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
}).outputText, {
  exports: exportsApi, require, process, URL, Headers, FormData, setTimeout,
  localStorage: { getItem: (key) => key === 'contrx_token' ? token : null },
  window: {
    location: { hostname: 'localhost', protocol: 'http:' },
    dispatchEvent: () => { events++; token = null; },
  },
  CustomEvent: class { constructor(type, init) { this.type = type; this.detail = init.detail; } },
  fetch: () => new Promise((resolve) => pending.push(resolve)),
});
const unauthorized = () => new Response(JSON.stringify({
  code: 'SESSION_EXPIRED', message: 'Sua sessão foi encerrada. Entre novamente para continuar.',
}), { status: 401 });

(async () => {
  const first = exportsApi.apiFetch('/first').catch(error => error);
  const second = exportsApi.apiFetch('/second').catch(error => error);
  pending.shift()(unauthorized());
  assert.ok(exportsApi.isSessionReplacedError(await first));
  pending.shift()(unauthorized());
  assert.ok(exportsApi.isSessionReplacedError(await second));
  assert.equal(events, 1);

  token = 'old-token';
  const stale = exportsApi.apiFetch('/stale').catch(error => error);
  token = 'new-token';
  pending.shift()(unauthorized());
  assert.ok(exportsApi.isSessionReplacedError(await stale));
  assert.equal(token, 'new-token');
  assert.equal(events, 1);

  const login = exportsApi.apiFetch('/login', { auth: false }).catch(error => error);
  pending.shift()(unauthorized());
  assert.equal(exportsApi.isSessionReplacedError(await login), false);
  assert.equal(events, 1);
  console.log('OK: 401 concorrentes, novo login preservado e autenticação pública.');
})().catch(error => { console.error(error); process.exitCode = 1; });
