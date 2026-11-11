// Validação local do HTML e dos arquivos XLSX sem sessão de navegador ou banco.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const JSZip = require('jszip');
let downloaded;
function load(relative, dependencies) {
  const filename = path.resolve(__dirname, '..', relative);
  const source = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true },
  }).outputText;
  const exports = {};
  const context = {
    exports, require: (name) => dependencies[name] ?? require(name),
    document: { createElement: () => ({ click() {} }) },
    URL: { createObjectURL: (blob) => { downloaded = blob; return 'blob:test'; }, revokeObjectURL() {} },
    setTimeout: (callback) => callback(),
  };
  vm.runInNewContext(source, context, { filename });
  return exports;
}
(async () => {
  const navigation = load('services/business-navigation.ts', {});
  assert.equal(navigation.isBusinessRouteAllowed('/relatorios', 'CONFECCOES'), false);
  assert.equal(fs.existsSync(path.resolve(__dirname, '../app/relatorios/page.tsx')), false);
  const salesPage = fs.readFileSync(path.resolve(__dirname, '../app/vendas/page.tsx'), 'utf8');
  assert.ok(salesPage.includes('<RetailReportsCenter />'));
  const retailCenter = fs.readFileSync(path.resolve(__dirname, '../app/vendas/central-relatorios.tsx'), 'utf8');
  assert.ok(!retailCenter.includes('href="/financeiro'));
  assert.ok(!retailCenter.includes('href="/bancos'));
  assert.equal(navigation.isBusinessRouteAllowed('/vendas', 'CONFECCOES'), true);
  assert.equal(navigation.isBusinessRouteAllowed('/financeiro', 'CONFECCOES'), false);
  const sales = load('services/sales-report.ts', {});
  const reports = load('services/management-reports.ts', { './api': {}, './sales-report': sales });
  const report = {
    title: 'Produtos vendidos', company: 'Empresa <A>', user: 'Operador & auditor',
    generatedAt: '2026-11-09T12:00:00Z', timeZone: 'America/Manaus',
    filters: { start: '2026-11-01', end: '2026-11-09' },
    columns: ['Código', 'Produto', 'Quantidade líquida', 'Líquido', 'Custo histórico'],
    rows: [['001', '<script>alert(1)</script>\u0001', '2', '90.10', null], ['002', '=HYPERLINK("url")', '1', '0.20', null]],
    totals: { 'Líquido': '90.30' }, warnings: ['Custo histórico indisponível'], count: 2,
  };
  const html = reports.managementReportHtml(report);
  assert.ok(html.includes('Empresa &lt;A&gt;'));
  assert.ok(html.includes('Operador &amp; auditor'));
  assert.ok(html.includes('&lt;script&gt;'));
  assert.ok(!html.includes('<script>'));
  assert.ok(html.includes('Indisponível'));
  assert.ok(html.includes('90.30'));
  await reports.downloadManagementWorkbook(report);
  const zip = await JSZip.loadAsync(await downloaded.arrayBuffer());
  const sheet = await zip.file('xl/worksheets/sheet1.xml').async('string');
  assert.ok(sheet.includes('<c><v>90.1</v></c>'));
  assert.ok(sheet.includes('<c><v>2</v></c>'));
  assert.ok(sheet.includes('<t xml:space="preserve">001</t>'));
  assert.ok(sheet.includes('=HYPERLINK(&quot;url&quot;)'));
  assert.ok(!sheet.includes('<f>'));
  assert.ok(!sheet.includes('\u0001'));
  assert.ok(zip.file('[Content_Types].xml'));
  assert.ok(zip.file('xl/_rels/workbook.xml.rels'));
  await sales.downloadSalesWorkbook([], false);
  assert.ok(await JSZip.loadAsync(await downloaded.arrayBuffer()));
  console.log('HTML e XLSX: escaping, metadados, números, códigos, fórmulas como texto e exportação legada validados.');
})().catch((error) => { console.error(error); process.exitCode = 1; });
