import JSZip from "jszip";
import type { SalesOrder, SalesOrderDetails } from "./vendas.service";

export const reportMoney = (value: string | number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const escapeReport = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
export function reportRows(
  orders: SalesOrder[],
  detailed: boolean,
): (string | number)[][] {
  const rows: (string | number)[][] = [
    [
      "Data",
      "Venda",
      "Tipo",
      "Cliente",
      "Vendedor",
      "Situação",
      "Pagamento",
      "Total",
      "Desconto",
      "Comissão",
      "Informações",
    ],
  ];
  for (const order of orders) {
    rows.push([
      new Date(order.completedAt || order.createdAt).toLocaleString("pt-BR"),
      order.number,
      order.saleType,
      order.customerName,
      order.sellerName,
      order.status,
      order.paymentMethod,
      Number(order.total) - Number(order.debtOffset || 0),
      Number(order.discount),
      Number(order.commissionTotal || 0),
      order.paymentDetails
        ? Object.entries(order.paymentDetails)
            .filter(([, amount]) => Number(amount))
            .map(([method, amount]) => `${method}: ${reportMoney(amount)}`)
            .join("; ")
        : "",
    ]);
    if (!detailed) continue;
    if (order.conditionalSummary)
      rows.push([
        "",
        order.number,
        "CONDICIONAL",
        "",
        "",
        "",
        "",
        "",
        "",
        "",
        `Enviado: ${order.conditionalSummary.sent}; devolvido: ${order.conditionalSummary.returned}; vendido: ${order.conditionalSummary.sold}; pendente: ${order.conditionalSummary.pending}`,
      ]);
    for (const item of order.items)
      rows.push([
        "",
        order.number,
        "ITEM",
        item.name,
        item.variantName || "",
        "",
        "",
        Number(item.subtotal),
        "",
        "",
        `Quantidade: ${item.quantity}; unitário: ${reportMoney(item.unitPrice)}`,
      ]);
    for (const charge of (order as SalesOrderDetails).receivables || []) {
      rows.push([
        new Date(charge.dueDate).toLocaleDateString("pt-BR"),
        order.number,
        "PARCELA",
        "",
        "",
        charge.cancelledAt ? "CANCELADA" : "",
        "",
        Number(charge.amount),
        "",
        "",
        `Parcela ${charge.installmentNumber || 1}`,
      ]);
      for (const payment of charge.payments)
        rows.push([
          new Date(payment.paidAt).toLocaleDateString("pt-BR"),
          order.number,
          "RECEBIMENTO",
          "",
          "",
          "",
          payment.method,
          Number(payment.amountPaid),
          "",
          "",
          "",
        ]);
    }
    for (const event of (order as SalesOrderDetails).events || [])
      rows.push([
        new Date(event.createdAt).toLocaleString("pt-BR"),
        order.number,
        "EVENTO",
        "",
        "",
        event.action,
        "",
        "",
        "",
        "",
        typeof event.details.reason === "string" ? event.details.reason : "",
      ]);
  }
  return rows;
}
export function buildSalesReport(
  orders: SalesOrder[],
  detailed: boolean,
  filters: string,
) {
  const rows = reportRows(orders, detailed);
  const valid = orders.filter(
    (order) => !["ESTORNADA", "CANCELADA"].includes(order.status),
  );
  const total = valid.reduce(
    (sum, order) => sum + Number(order.total) - Number(order.debtOffset || 0),
    0,
  );
  return `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Relatório de vendas</title><style>@page{size:A4 landscape;margin:12mm}body{font:11px Arial;color:#172033;padding:20px}table{width:100%;border-collapse:collapse}td,th{padding:7px;border-bottom:1px solid #ddd;text-align:left;overflow-wrap:anywhere}thead{display:table-header-group}tr{break-inside:avoid}th{background:#eee}h1{font-size:20px}</style><h1>Relatório ${detailed ? "completo" : "simples"}</h1><p>${escapeReport(filters)}</p><p>Emitido em ${escapeReport(new Date().toLocaleString("pt-BR"))}. Documentos: ${orders.length}. Total líquido de documentos não cancelados/estornados: ${escapeReport(reportMoney(total))}.</p><p>Composição comercial dos documentos. Valores não representam exclusivamente recebimentos efetivos de caixa.</p><table><thead><tr>${rows[0].map((value) => `<th>${escapeReport(value)}</th>`).join("")}</tr></thead><tbody>${rows
    .slice(1)
    .map(
      (row) =>
        `<tr>${row.map((value) => `<td>${escapeReport(value)}</td>`).join("")}</tr>`,
    )
    .join("")}</tbody></table></html>`;
}
export async function downloadSalesWorkbook(
  orders: SalesOrder[],
  detailed: boolean,
) {
  const zip = new JSZip();
  const rows = reportRows(orders, detailed);
  const xml = (value: unknown) =>
    escapeReport(value).replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
      "",
    );
  zip.file(
    "[Content_Types].xml",
    '<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>',
  );
  zip.file(
    "_rels/.rels",
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
  );
  zip.file(
    "xl/workbook.xml",
    '<?xml version="1.0" encoding="UTF-8"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Vendas" sheetId="1" r:id="rId1"/></sheets></workbook>',
  );
  zip.file(
    "xl/_rels/workbook.xml.rels",
    '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>',
  );
  zip.file(
    "xl/worksheets/sheet1.xml",
    `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${rows.map((row, index) => `<row r="${index + 1}">${row.map((value) => (typeof value === "number" ? `<c><v>${value}</v></c>` : `<c t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`)).join("")}</row>`).join("")}</sheetData></worksheet>`,
  );
  const blob = await zip.generateAsync({
    type: "blob",
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "relatorio-vendas.xlsx";
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
