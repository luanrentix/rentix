const assert = require("node:assert/strict");
const fs = require("node:fs");
const ts = require("typescript");
const JSZip = require("jszip");
const target = { exports: {} };
new Function(
  "module",
  "exports",
  "require",
  ts.transpileModule(fs.readFileSync("services/sales-report.ts", "utf8"), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020,
      esModuleInterop: true,
    },
  }).outputText,
)(target, target.exports, require);
const { buildSalesReport, reportRows, downloadSalesWorkbook } = target.exports;
const order = {
  id: "sale",
  number: 1,
  customerName: "<script>alert(1)</script>",
  sellerName: "VENDEDOR",
  saleType: "VENDA",
  status: "CONCLUIDA",
  createdAt: "2026-11-06T12:00:00Z",
  items: [
    {
      name: '=HYPERLINK("unsafe")',
      quantity: 2,
      unitPrice: "50",
      subtotal: "100",
    },
  ],
  subtotal: 100,
  total: 100,
  discount: 0,
  commissionTotal: 5,
  paymentMethod: "MISTO",
  paymentDetails: { SALDO_CLIENTE: 30, PIX: 70 },
  receivables: [
    {
      amount: "100",
      dueDate: "2026-11-06T12:00:00Z",
      payments: [
        { amountPaid: "70", method: "PIX", paidAt: "2026-11-06T12:00:00Z" },
      ],
    },
  ],
  events: [
    { action: "CRIADA", createdAt: "2026-11-06T12:00:00Z", details: {} },
  ],
};
const html = buildSalesReport(
  [order, { ...order, number: 2, status: "CANCELADA", total: 900 }],
  true,
  "<img src=x>",
);
assert.ok(!html.includes("<script>"));
assert.ok(!html.includes("<img src=x>"));
assert.ok(html.includes("&lt;script&gt;"));
assert.ok(html.includes("100,00"));
assert.equal(reportRows([order], false).length, 2);
assert.equal(reportRows([order], true).length, 6);
let captured;
global.document = { createElement: () => ({ click() {} }) };
const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
URL.createObjectURL = (blob) => {
  captured = blob;
  return "blob:test";
};
URL.revokeObjectURL = () => {};
(async () => {
  try {
    await downloadSalesWorkbook([order], true);
    const zip = await JSZip.loadAsync(await captured.arrayBuffer());
    for (const path of [
      "[Content_Types].xml",
      "_rels/.rels",
      "xl/workbook.xml",
      "xl/_rels/workbook.xml.rels",
      "xl/worksheets/sheet1.xml",
    ])
      assert.ok(zip.file(path), path);
    const sheet = await zip.file("xl/worksheets/sheet1.xml").async("string");
    assert.ok(sheet.includes('t="inlineStr"'));
    assert.ok(sheet.includes("=HYPERLINK(&quot;unsafe&quot;)"));
    assert.ok(!sheet.includes("<f>"));
    assert.ok(sheet.includes("<v>100</v>"));
    console.log(
      "APROVADO: relatório simples/completo, conteúdo escapado e Excel com números e texto sem fórmulas executáveis.",
    );
  } finally {
    URL.createObjectURL = originalCreate;
    URL.revokeObjectURL = originalRevoke;
    delete global.document;
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
