import type { SalesOrder } from "./vendas.service";
import { allocateSaleAdjustment, saleAdjustmentCents } from "./sales-numbers";

const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
const styleTag = (nonce?: string) =>
  `<style${nonce ? ` nonce="${escape(nonce)}"` : ''}>`;
const receiptSharedStyles =
  '.receipt-promo-note{display:block;font-weight:bold;color:#065f46}.receipt-adjustment-note{display:block}.col-4{width:4%}.col-8{width:8%}.col-9{width:9%}.col-10{width:10%}.col-11{width:11%}.col-12{width:12%}.col-13-5{width:13.5%}.col-14{width:14%}.col-19{width:19%}.col-25{width:25%}.col-38{width:38%}.col-49{width:49%}';
const money = (value: unknown) =>
  Number(value || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
const methods: Record<string, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  CARTAO_DEBITO: "Cartão de débito",
  CARTAO_CREDITO: "Cartão de crédito",
  DEBITO: "Cartão de débito",
  CREDITO: "Cartão de crédito",
  CREDIARIO: "Crediário (a receber)",
  SALDO_CLIENTE: "Crédito do cliente",
  MISTO: "Pagamento misto",
};
const types: Record<string, string> = {
  VENDA: "Comprovante de venda",
  PEDIDO: "Pedido de venda",
  ORCAMENTO: "Orçamento",
  CONDICIONAL: "Comprovante de condicional",
  TROCA: "Comprovante de troca / devolução",
};

function itemPriceNote(item: SalesOrder["items"][number]) {
  if (item.priceType === "PROMOCIONAL")
    return `<small class="receipt-promo-note">PROMOÇÃO · original ${money(item.originalUnitPrice)} · sem desconto adicional</small>`;
  const adjustments = [
    Number(item.discount || 0) > 0
      ? `Desconto/un.: ${money(item.discount)}`
      : "",
    Number(item.addition || 0) > 0
      ? `Acréscimo/un.: ${money(item.addition)}`
      : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return adjustments
    ? `<small class="receipt-adjustment-note">Original: ${money(item.originalUnitPrice)} · ${adjustments}</small>`
    : "";
}

export type SalesQuotePrintOptions = {
  validUntil?: string;
  deliveryAddress?: string;
};

export type SalesReceiptFormat = "a4" | "thermal44";

function quoteAddress(value: Record<string, unknown>) {
  const street = [value.address, value.number, value.complement]
    .filter(Boolean)
    .join(", ");
  const city = [value.city, value.state].filter(Boolean).join(" - ");
  return [
    street,
    value.neighborhood,
    city,
    value.zipCode ? `CEP: ${value.zipCode}` : "",
  ]
    .filter(Boolean)
    .join(", ");
}

function buildSalesQuote(
  order: SalesOrder,
  company: Record<string, unknown>,
  options: SalesQuotePrintOptions,
  styleNonce?: string,
) {
  const number = (value: unknown, digits = 2) =>
    Number(value || 0).toLocaleString("pt-BR", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  const customer: Partial<NonNullable<SalesOrder["customer"]>> =
    order.customer || {};
  const address = quoteAddress(customer);
  const logo = String(
    company.logo ||
      company.logoUrl ||
      company.logoBase64 ||
      company.companyLogo ||
      "",
  );
  const safeLogo =
    /^(https?:\/\/|\/(?!\/))/.test(logo) ||
    /^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=\s]+$/i.test(logo);
  const validity = /^\d{4}-\d{2}-\d{2}$/.test(options.validUntil || "")
    ? options.validUntil!.split("-").reverse().join("/")
    : "—";
  const rows = order.items
    .map(
      (item) =>
        `<tr><td class="numeric">${Number(item.quantity).toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 3 })}</td><td>${escape(item.sku || "—")}</td><td>${escape(item.name)}${item.variantName ? ` / ${escape(item.variantName)}` : ""}${item.brand ? ` - ${escape(item.brand)}` : ""}${itemPriceNote(item)}</td><td class="numeric">${number(item.unitPrice)}</td><td class="numeric">${number(item.subtotal)}</td></tr>`,
    )
    .join("");
  const percent = (value: string | number) =>
    Number(order.subtotal) > 0
      ? number((Number(value) / Number(order.subtotal)) * 100)
      : "0,00";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Orçamento #${escape(order.number)}</title>${styleTag(styleNonce)}${receiptSharedStyles}
  *{box-sizing:border-box}html,body{margin:0;background:white;color:#111;font-family:Arial,sans-serif;font-size:8pt}body{padding:8mm}main{max-width:194mm;min-height:279mm;margin:0 auto;display:flex;flex-direction:column}.company{display:flex;align-items:center;gap:3mm;border-bottom:1pt solid #bcbcbc;padding-bottom:2mm}.logo{width:24mm;height:14mm;object-fit:contain;flex-shrink:0}.company h1{font-size:14pt;margin:0 0 1mm}.company p{font-weight:bold;line-height:1.35;margin:0}.registration{display:flex;gap:6mm;flex-wrap:wrap}.heading h2{font-size:14pt;margin:2mm 0 1mm}.non-fiscal{font-size:12pt;font-weight:bold;margin:0 0 2mm}.details{line-height:1.4;margin-bottom:1.5mm}.detail{display:flex;gap:2mm}.detail b{flex:0 0 16mm}.dates{display:flex;gap:10mm}.dates b{margin-right:2mm}.address{flex:1;overflow-wrap:anywhere}.phone{min-width:40mm}table{width:100%;border-collapse:collapse;table-layout:fixed;font-size:8pt}th,td{border:0.5pt solid #bcbcbc;padding:1.2mm 1.5mm;vertical-align:top;overflow-wrap:anywhere}th{text-align:left;font-size:9pt}td{line-height:1.2}.numeric{text-align:right;white-space:nowrap}.summary{display:flex;justify-content:space-between;gap:4mm;break-inside:avoid;margin-top:1mm}.weights{flex:1;font-size:8pt;display:flex;gap:5mm;align-items:flex-start}.totals{width:68mm;flex-shrink:0}.total-row{display:grid;grid-template-columns:1fr 21mm 27mm;gap:2mm;text-align:right;line-height:1.5}.total-row b{white-space:nowrap}.grand-total{margin-top:5mm;font-size:10pt}.notes{white-space:pre-wrap;overflow-wrap:anywhere;margin-top:5mm;line-height:1.4}.fiscal-reminder{font-size:12pt;font-weight:bold;margin-top:9mm}.footer{margin-top:auto;padding-top:8mm;display:flex;justify-content:space-between;gap:4mm;font-size:7pt}.status{font-weight:bold;margin:2mm 0}@page{size:A4 portrait;margin:8mm 8mm 14mm}@media print{body{padding:0}thead{display:table-header-group}tr{break-inside:avoid}main{max-width:none;min-height:0;display:block}.footer{position:static;margin:8mm 0 0;padding:0;break-inside:avoid}}
  </style></head><body><main><div class="company">${safeLogo && logo ? `<img class="logo" src="${escape(logo)}" alt="Logo da empresa">` : ""}<div><h1>${escape(company.tradeName || company.companyName || "Loja")}</h1><div class="registration"><b>CNPJ/CPF: ${escape(company.document || "—")}</b><b>Inscr. Est.: ${escape(company.stateRegistration || "—")}</b></div><p>${escape(quoteAddress(company) || "Endereço não informado")}</p><p>FONE: ${escape(company.phone || "—")}</p></div></div>
  <div class="heading"><h2>Orçamento&nbsp;&nbsp; ${escape(order.number)}</h2><p class="non-fiscal">"NÃO TEM VALOR FISCAL"</p></div>
  <div class="details"><div class="dates"><span><b>Data:</b> ${escape(new Date(order.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Manaus" }))}</span><span><b>Válido até:</b> ${escape(validity)}</span></div><div class="detail"><b>Cliente:</b><span>${escape(order.customerName)}</span></div><div class="detail"><b>Endereço:</b><span class="address">${escape(address || "—")}</span><span class="phone"><b>Fone:</b> ${escape(customer.phone || "—")}</span></div><div class="detail"><b>Entrega:</b><span class="address">${escape(options.deliveryAddress?.trim() || "—")}</span></div><div class="detail"><b>Vendedor:</b><span>${escape(order.sellerName)}</span></div></div>
  ${order.status !== "CONCLUIDA" ? `<p class="status">Situação: ${escape(order.status.replaceAll("_", " "))}</p>` : ""}
  <table><colgroup><col class="col-10"><col class="col-14"><col class="col-49"><col class="col-13-5"><col class="col-13-5"></colgroup><thead><tr><th class="numeric">Quant.</th><th>Código</th><th>Produto/Marca</th><th class="numeric">Vr. Unit. R$</th><th class="numeric">Total R$</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="summary"><div class="weights"><b>PESO TOTAL:</b><span><b>Bruto</b> —</span><span><b>Líquido</b> —</span></div><div class="totals"><div class="total-row"><b>Sub-total</b><span></span><span>${number(order.subtotal)}</span></div><div class="total-row"><b>Desconto</b><span>${percent(order.discount)} %</span><span>${number(order.discount)}</span></div><div class="total-row"><b>Acréscimo</b><span>${percent(order.addition)} %</span><span>${number(order.addition)}</span></div><div class="total-row grand-total"><b>Total</b><span></span><span>${number(order.total)}</span></div></div></div>
  ${order.notes ? `<p class="notes"><b>Observações</b><br>${escape(order.notes)}</p>` : ""}<p class="fiscal-reminder">"EXIJA O CUPOM FISCAL"</p><div class="footer"><span>Este documento não comprova recebimento de pagamento.</span><span>Documento emitido pelo Contrx.</span></div></main></body></html>`;
}

function buildSalesConditional(
  order: SalesOrder,
  company: Record<string, unknown>,
  styleNonce?: string,
) {
  const number = (value: unknown, digits = 2) => Number(value || 0).toLocaleString("pt-BR", { minimumFractionDigits: digits, maximumFractionDigits: digits });
  const customer: Partial<NonNullable<SalesOrder["customer"]>> = order.customer || {};
  const contacts = [customer.phone, customer.phone2, customer.email].filter(Boolean).join(" / ");
  const adjustments = order.items.map(item => saleAdjustmentCents({ quantity: item.quantity, unitPrice: Number(item.unitPrice), baseUnitPrice: item.baseUnitPrice == null ? undefined : Number(item.baseUnitPrice), discount: Number(item.discount || 0) }));
  const itemDiscount = adjustments.reduce((sum, item) => sum + item.discount, 0);
  const itemAddition = adjustments.reduce((sum, item) => sum + item.addition, 0);
  const discounts = allocateSaleAdjustment(Number(order.discount), order.items.map(item => item.priceType === "PROMOCIONAL" || item.allowDiscount === false ? 0 : Math.round(Number(item.subtotal) * 100)));
  const additions = allocateSaleAdjustment(Number(order.addition), order.items.map(item => item.allowAddition === false ? 0 : Math.round(Number(item.subtotal) * 100)));
  const rows = order.items.map((item, index) => {
    const original = Number(item.originalUnitPrice ?? item.unitPrice);
    const selected = Number(item.baseUnitPrice ?? item.unitPrice);
    const final = (Math.round(Number(item.subtotal) * 100) - discounts[index] + additions[index]) / 100;
    return `<tr><td>${escape(item.sku || "—")}</td><td>${escape(item.barcode || "—")}</td><td>${escape(item.name)}${item.variantName ? ` / ${escape(item.variantName)}` : ""}</td><td>${escape(item.unit || "—")}</td><td class="numeric">${number(item.quantity, 3)}</td><td class="numeric ${item.priceType === "PROMOCIONAL" ? "original" : ""}">${number(original)}</td><td class="numeric">${number(selected)}${item.priceType === "PROMOCIONAL" ? '<small>Promoção</small>' : ""}</td><td class="numeric">${number((adjustments[index].discount + discounts[index]) / 100)}</td><td class="numeric">${number(final)}</td></tr>`;
  }).join("");
  const terms = "O PRAZO PARA DEVOLUÇÃO DE CONDICIONAL É DE 1 DIA (24 Horas). A NÃO ENTREGA ATÉ O PRAZO DETERMINADO, ESTARÁ CONFIRMANDO SUA RESPONSABILIDADE DE COMPRA DAS MERCADORIAS CONSTANTE NO MESMO.";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Condicional #${escape(order.number)}</title>${styleTag(styleNonce)}${receiptSharedStyles}
  *{box-sizing:border-box}body{margin:0;padding:8mm;color:#111;background:white;font:9pt Arial,sans-serif}main{max-width:194mm;margin:auto}.company{position:relative;min-height:18mm;padding:0 0 5mm 35mm}.company h1{font-size:14pt;margin:0}.company p{margin:1mm 0}.company .phone{font-size:13pt;font-weight:bold}.printed{text-align:right;font-size:8pt;margin-bottom:3mm}.customer{margin-top:3mm;line-height:1.4}.customer p{margin:0}.customer b{display:inline-block;min-width:17mm;text-align:right;margin-right:2mm}.meta{text-align:center;border-top:1pt solid #444;padding:2mm 0;margin-top:1mm}h2{font-size:10pt;display:inline;margin:0}table{width:100%;table-layout:fixed;border-collapse:collapse;font-size:8pt}th{background:#d9d9d9;border:0.5pt solid #333;font-weight:normal;text-align:left;padding:1mm}td{padding:1.2mm;vertical-align:top;overflow-wrap:anywhere;line-height:1.2}tbody tr:nth-child(odd){background:#f0f0f0}.numeric{text-align:right;white-space:nowrap}.summary{display:grid;grid-template-columns:1fr 55mm;gap:3mm;border-top:1pt dashed #555;padding-top:2mm;break-inside:avoid}.summary p{margin:1mm 0}.counts p,.totals p{display:flex;justify-content:space-between;gap:2mm}.counts{padding-right:12mm}.totals{text-align:right}.original{text-decoration:line-through;color:#666}small{display:block;font-size:6.5pt;text-decoration:none}.notes{white-space:pre-wrap;overflow-wrap:anywhere;margin-top:2mm}.terms{display:grid;grid-template-columns:1.6fr 1fr;gap:9mm;margin-top:6mm;break-inside:avoid}.terms p{font-size:9pt;line-height:1.3;margin:0}.signature{text-align:center;margin-top:22mm;padding-top:2mm;border-top:1pt solid #444;font-size:8pt}.closing{break-inside:avoid}.notice{margin-top:5mm;font-size:7pt;color:#444}.status{margin:1mm 0;font-size:8pt}@page{size:A4 portrait;margin:7mm}@media print{body{padding:0}thead{display:table-header-group}tr{break-inside:avoid}main{max-width:none}}
  </style></head><body><main>
  <div class="printed">Impressão em ${escape(new Date().toLocaleString("pt-BR", { timeZone: "America/Manaus" }))}</div>
  <header class="company"><h1>${escape(company.tradeName || company.companyName || "Loja")}</h1><p>${escape(quoteAddress(company) || "Endereço não informado")}</p><p class="phone">Fone: ${escape(company.phone || "—")}</p></header>
  <section class="customer"><p><b>Cliente:</b>${escape(customer.name || order.customerName)}</p><p><b>Endereço:</b>${escape(quoteAddress(customer) || "Endereço não cadastrado")}</p><p><b>Contato:</b>${escape(contacts || "Contato não cadastrado")}</p></section>
  <div class="meta"><h2>Condicional</h2> &nbsp; <b>Nº:</b> ${escape(order.number)} &nbsp; - &nbsp; <b>Data:</b> ${escape(new Date(order.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Manaus" }))} &nbsp; - &nbsp; <b>Vendedor:</b> ${escape(order.sellerName)}</div>
  ${order.status !== "CONCLUIDA" ? `<p class="status">Situação: ${escape(order.status.replaceAll("_", " "))}</p>` : ""}
  <table><colgroup><col class="col-8"><col class="col-12"><col class="col-25"><col class="col-4"><col class="col-8"><col class="col-11"><col class="col-11"><col class="col-9"><col class="col-12"></colgroup><thead><tr><th>REF.</th><th>Cód. barras</th><th>PRODUTO</th><th>UN.</th><th class="numeric">QTDE</th><th class="numeric">ORIGINAL</th><th class="numeric">VENDA /<br>PROMO</th><th class="numeric">DESC.</th><th class="numeric">TOTAL</th></tr></thead><tbody>${rows}</tbody></table>
  <div class="closing"><section class="summary"><div class="counts"><p><span>Total de itens: ${number(order.items.reduce((sum,item) => sum + Number(item.quantity),0),3)}</span><span>Valor dos itens: ${number(order.subtotal)}</span></p><div class="notes"><b>Observações:</b>${order.notes ? `<br>${escape(order.notes)}` : ""}</div></div><div class="totals"><p><b>Subtotal:</b><span>${number(Number(order.subtotal) + (itemDiscount - itemAddition) / 100)}</span></p><p><span>Desc. total:</span><span>${number(Number(order.discount) + itemDiscount / 100)}</span></p>${Number(order.addition) + itemAddition / 100 > 0 ? `<p><span>Acréscimo:</span><span>${number(Number(order.addition) + itemAddition / 100)}</span></p>` : ""}<p><b>Total:</b><b>${number(order.total)}</b></p><p>Condicional</p></div></section>
  <section class="terms"><p>${escape(terms)}</p><div class="signature">AUTORIZAÇÃO DO CLIENTE</div></section>
  <footer class="notice">DOCUMENTO NÃO FISCAL. Este documento não comprova recebimento de pagamento. Documento emitido pelo Contrx.</footer></div>
  </main></body></html>`;
}

export function buildSalesReceipt(
  order: SalesOrder,
  company: Record<string, unknown> = {},
  tender = order.cashTender || "",
  quoteOptions: SalesQuotePrintOptions = {},
  format: SalesReceiptFormat = "a4",
  styleNonce?: string,
) {
  if (order.saleType === "ORCAMENTO")
    return buildSalesQuote(order, company, quoteOptions, styleNonce);
  if (order.saleType === "CONDICIONAL")
    return buildSalesConditional(order, company, styleNonce);
  const thermal = format === "thermal44";
  const thermalItems = order.items.map((item, index) =>
    `<article class="receipt-item"><strong>${index + 1}. ${escape(item.name)}</strong>${item.variantName ? `<small>${escape(item.variantName)}</small>` : ""}<small>Cód.: ${escape(item.sku || "—")}</small>${itemPriceNote(item)}<p>${escape(Number(item.quantity).toLocaleString("pt-BR"))} × ${money(item.unitPrice)}</p><p class="item-total"><span>Total do item</span><strong>${money(item.subtotal)}</strong></p></article>`,
  ).join("");
  const items = order.items
    .map(
      (item) =>
        `<tr><td>${escape(item.sku || "—")}</td><td>${escape(item.name)}${item.variantName ? `<small>${escape(item.variantName)}</small>` : ""}${itemPriceNote(item)}</td><td class="number">${escape(Number(item.quantity).toLocaleString("pt-BR"))}</td><td class="number">${money(item.unitPrice)}</td><td class="number">${money(item.subtotal)}</td></tr>`,
    )
    .join("");
  const payments =
    order.paymentMethod === "MISTO"
      ? Object.entries(order.paymentDetails || {}).filter(
          ([, value]) => value > 0,
        )
      : [[order.paymentMethod, Number(order.total)]];
  const financial =
    ["VENDA", "TROCA"].includes(order.saleType) && order.status === "CONCLUIDA";
  const cashAmount =
    order.paymentMethod === "DINHEIRO"
      ? Number(order.total)
      : Number(order.paymentDetails?.DINHEIRO || 0);
  const cashTender = Number(
    tender.includes(",") ? tender.replace(/\./g, "").replace(",", ".") : tender,
  );
  const cash =
    financial &&
    cashAmount > 0 &&
    tender &&
    Number.isFinite(cashTender) &&
    cashTender >= cashAmount
      ? `<p>Dinheiro entregue: <strong>${money(cashTender)}</strong> · Troco: <strong>${money(Math.round((cashTender - cashAmount) * 100) / 100)}</strong></p>`
      : "";
  const returned = order.returnedItems?.length
    ? `<h3>Itens devolvidos</h3><ul>${order.returnedItems.map((item) => `<li>${escape(item.quantity)} × ${escape(item.name)} ${escape(item.variantName || "")}</li>`).join("")}</ul><p>Valor devolvido: ${money(order.returnTotal)} · Abatimento de dívida: ${money(order.debtOffset)}</p>`
    : "";
  const cardDetails = financial
    ? (order.cardPayments || [])
        .map(
          (card) =>
            "<p>" +
            escape(card.administratorName || "Administradora") +
            " · " +
            escape(card.brand) +
            (card.lastFour ? " · **** " + escape(card.lastFour) : "") +
            " · " +
            escape(card.installments) +
            "x<br><small>NSU: " +
            escape(card.nsu) +
            (card.authorizationCode
              ? " · Autorização: " + escape(card.authorizationCode)
              : "") +
            "</small></p>",
        )
        .join("")
    : "";
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escape(types[order.saleType] || "Pedido")} #${escape(order.number)}</title>${styleTag(styleNonce)}${receiptSharedStyles}
  *{box-sizing:border-box}body{margin:0;padding:22px;background:#fff;color:#111827;font:12px Arial,sans-serif}main{max-width:720px;margin:auto}header{text-align:center;border-bottom:2px solid #111827;padding-bottom:15px}h1{font-size:21px;margin:0 0 6px}h2{font-size:15px;margin:12px 0 6px}h3{font-size:12px;margin:16px 0 6px}p{margin:6px 0;line-height:1.5}.meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:16px 0}.muted,small{color:#64748b;font-size:10px}small{display:block;margin-top:4px}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:11px}th{background:#f1f5f9;text-align:left;font-size:9px;text-transform:uppercase}th,td{padding:9px 5px;border-bottom:1px solid #e2e8f0;vertical-align:top;overflow-wrap:anywhere}.number{text-align:right;white-space:nowrap}.totals{margin-left:auto;max-width:310px}.totals p{display:flex;justify-content:space-between;gap:15px}.total{border-top:2px solid #111827;padding-top:10px;font-size:17px;font-weight:bold}.notes{white-space:pre-wrap;border-top:1px dashed #94a3b8;padding-top:12px}footer{text-align:center;border-top:1px dashed #94a3b8;margin-top:25px;padding-top:12px;font-size:10px;color:#64748b}@page{margin:12mm}@media print{body{padding:0}tr{break-inside:avoid}thead{display:table-header-group}}
  body{background:#eef1f5;overflow-wrap:anywhere}main{max-width:186mm;background:white;padding:9mm;box-shadow:0 2px 12px #17203312}header{padding-bottom:18px}h1{font-size:24px;letter-spacing:.3px}h2{font-size:18px;margin-top:18px}.meta{padding:12px;border:1px solid #d5dbe3;border-radius:6px;margin:20px 0}table{table-layout:fixed;margin:20px 0}th{border-top:1px solid #aeb8c6}th,td{padding:10px 6px}.number{white-space:normal;font-variant-numeric:tabular-nums}.totals{break-inside:avoid}.total{font-size:19px;padding:12px 0;border-bottom:1px solid #111827}.muted,small,footer{color:#475569}@page{size:A4 portrait;margin:12mm}@media print{body{background:white;color:#000}main{max-width:none;padding:0;box-shadow:none}footer{break-inside:avoid}}
  ${thermal ? `
  body{padding:16px 0;font-size:9px;color:#000}main{width:44mm;max-width:44mm;padding:2mm}header{padding-bottom:3mm;border-bottom:1px dashed #000}h1{font-size:13px;letter-spacing:0}h2{font-size:11px;margin:3mm 0 1mm}h3{font-size:10px;margin:3mm 0 1mm}p{line-height:1.35;margin:1mm 0}small,.muted{font-size:8px;color:#000}small{margin-top:1mm}.meta{display:block;padding:2mm 0;margin:0;border:0;border-bottom:1px dashed #000;border-radius:0}.receipt-item{padding:2mm 0;border-bottom:1px dashed #000;break-inside:avoid}.receipt-item>strong{display:block;font-size:10px}.item-total{display:flex;justify-content:space-between;gap:1mm}.totals{max-width:none;margin-top:3mm}.totals p{gap:2mm}.totals p>span:last-child{flex-shrink:0}.total{font-size:12px;padding:2mm 0;border-color:#000}.notes{margin-top:3mm;padding-top:2mm;border-color:#000}footer{font-size:8px;color:#000;margin-top:4mm;padding-top:2mm;border-color:#000}ul{padding-left:12px}@page{size:auto;margin:0}@media print{html,body{width:44mm;margin:0;padding:0}main{width:44mm;max-width:44mm;padding:2mm;box-shadow:none}}
  ` : ""}
  </style></head><body><main><header><h1>${escape(company.tradeName || company.companyName || "Loja")}</h1>${company.document ? `<p>CNPJ/CPF: ${escape(company.document)}</p>` : ""}${company.phone ? `<p>Telefone: ${escape(company.phone)}</p>` : ""}${quoteAddress(company) ? `<p class="muted">${escape(quoteAddress(company))}</p>` : ""}<h2>${escape(types[order.saleType] || "Pedido")} #${escape(order.number)}</h2><p class="muted">DOCUMENTO NÃO FISCAL</p></header>
  <div class="meta"><div><p>Cliente: <strong>${escape(order.customerName)}</strong></p><p>Vendedor: ${escape(order.sellerName)}</p></div><div><p>Data: ${escape(new Date(order.completedAt || order.createdAt).toLocaleString("pt-BR", { timeZone: "America/Manaus" }))}</p><p>Situação: ${escape(order.status.replaceAll("_", " "))}</p></div></div>
  ${thermal ? `<section aria-label="Produtos">${thermalItems}</section>` : `<table><colgroup><col class="col-14"><col class="col-38"><col class="col-10"><col class="col-19"><col class="col-19"></colgroup><thead><tr><th>Código</th><th>Produto / variação</th><th class="number">Qtd.</th><th class="number">Unitário</th><th class="number">Total</th></tr></thead><tbody>${items}</tbody></table>`}${returned}
  <div class="totals"><p><span>Subtotal</span><span>${money(order.subtotal)}</span></p><p><span>Desconto</span><span>${money(order.discount)}</span></p><p><span>Acréscimo</span><span>${money(order.addition)}</span></p><p class="total"><span>${order.saleType === "TROCA" ? "Diferença" : "Total"}</span><span>${money(order.total)}</span></p></div>
  ${financial ? `<h3>${Number(order.total) < 0 ? "Tratamento da diferença" : "Forma de pagamento"}</h3>${Number(order.total) < 0 && order.returnDisposition === "CREDIT" ? "<p>Diferença lançada como crédito do cliente.</p>" : payments.map(([method, value]) => `<p>${escape(methods[String(method)] || method)}: <strong>${money(Math.abs(Number(value)))}</strong></p>`).join("")}${order.installments && payments.some(([method, value]) => method === "CREDIARIO" && Number(value) > 0) ? `<p>Crediário em ${escape(order.installments)} parcela(s).</p>` : ""}${cash}` : "<p>Este documento não comprova recebimento de pagamento.</p>"}
  ${cardDetails}${order.notes ? `<p class="notes"><strong>Observações</strong><br>${escape(order.notes)}</p>` : ""}<footer>Guarde este comprovante para apresentar em caso de troca.<br>Documento emitido pelo Contrx.</footer></main></body></html>`;
}
