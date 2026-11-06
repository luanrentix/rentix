// Executa os callbacks reais do AuthProvider com API, navegador e hooks isolados.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

async function main() {
  const storage = new Map();
  const routes = [];
  let response;
  const scopedKey = (company, key) => `contrx:${company}:${key}`;
  const modules = {
    react: {
      createContext: () => ({ Provider: 'provider' }),
      useState: value => [value, () => {}],
      useRef: value => ({ current: value }),
      useEffect: () => {},
      useCallback: callback => callback,
      useMemo: callback => callback(),
    },
    'react/jsx-runtime': { jsx: (type, props) => ({ type, props }) },
    'next/navigation': { useRouter: () => ({ push: route => routes.push(route) }) },
    '@/services/auth': {
      loginRequest: async () => response,
      loginCompanyUserRequest: async () => response,
      createAccountRequest: async () => response,
    },
    '@/services/api': {},
    '@/services/company-storage': {
      setCompanyStorageItem: (company, key, value) => storage.set(scopedKey(company, key), value),
    },
  };
  const compiled = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '../context/AuthContext.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const exports = {};
  vm.runInNewContext(compiled, {
    exports,
    require: name => { assert(name in modules, `Modulo inesperado: ${name}`); return modules[name]; },
    localStorage: { getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key) },
  });
  const auth = exports.AuthProvider({ children: null }).props.value;
  for (const role of ['USER', 'MANAGER', 'ADMIN', 'OWNER']) {
    response = { accessToken: 'test-token', user: { id: 'user', companyId: 'company', role, subscriptionStatus: 'TRIAL' } };
    for (const login of [() => auth.login('test@example.test', 'test'), () => auth.loginCompanyUser('CTX-ABCDE', 'test', 'test')]) {
      storage.set('contrx_show_trial_login_notice', 'true');
      storage.set(scopedKey('company', 'contrx_onboarding_pending'), 'true');
      routes.length = 0;
      await login();
      assert.deepEqual(routes, ['/inicio']);
      assert.equal(storage.has('contrx_show_trial_login_notice'), false);
      assert.equal(storage.get('contrx_token'), 'test-token');
    }
  }
  storage.clear();
  routes.length = 0;
  await auth.createAccount({});
  assert.equal(storage.get(scopedKey('company', 'contrx_onboarding_pending')), 'true');
  assert.equal(routes.length, 0);
  console.log('PASS: login por email e empresa para quatro perfis, pendencia antiga, aviso legado e cadastro inicial preservado.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
