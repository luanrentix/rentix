import type { SalesOrder } from "./vendas.service";

const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (char) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        char
      ]!,
  );
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

export function buildSalesReceipt(
  order: SalesOrder,
  company: Record<string, unknown> = {},
  tender = "",
) {
  const items = order.items
    .map(
      (item) =>
        `<tr><td>${escape(item.sku || "—")}</td><td>${escape(item.name)}${item.variantName ? `<small>${escape(item.variantName)}</small>` : ""}</td><td class="number">${escape(Number(item.quantity).toLocaleString("pt-BR"))}</td><td class="number">${money(item.unitPrice)}</td><td class="number">${money(item.subtotal)}</td></tr>`,
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
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${escape(types[order.saleType] || "Pedido")} #${escape(order.number)}</title><style>
  *{box-sizing:border-box}body{margin:0;padding:22px;background:#fff;color:#111827;font:12px Arial,sans-serif}main{max-width:720px;margin:auto}header{text-align:center;border-bottom:2px solid #111827;padding-bottom:15px}h1{font-size:21px;margin:0 0 6px}h2{font-size:15px;margin:12px 0 6px}h3{font-size:12px;margin:16px 0 6px}p{margin:6px 0;line-height:1.5}.meta{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;margin:16px 0}.muted,small{color:#64748b;font-size:10px}small{display:block;margin-top:4px}table{width:100%;border-collapse:collapse;margin:16px 0;font-size:11px}th{background:#f1f5f9;text-align:left;font-size:9px;text-transform:uppercase}th,td{padding:9px 5px;border-bottom:1px solid #e2e8f0;vertical-align:top;overflow-wrap:anywhere}.number{text-align:right;white-space:nowrap}.totals{margin-left:auto;max-width:310px}.totals p{display:flex;justify-content:space-between;gap:15px}.total{border-top:2px solid #111827;padding-top:10px;font-size:17px;font-weight:bold}.notes{white-space:pre-wrap;border-top:1px dashed #94a3b8;padding-top:12px}footer{text-align:center;border-top:1px dashed #94a3b8;margin-top:25px;padding-top:12px;font-size:10px;color:#64748b}@page{margin:12mm}@media print{body{padding:0}tr{break-inside:avoid}thead{display:table-header-group}}
  </style></head><body><main><header><h1>${escape(company.tradeName || company.companyName || "Loja")}</h1>${company.document ? `<p>CNPJ/CPF: ${escape(company.document)}</p>` : ""}${company.phone ? `<p>Telefone: ${escape(company.phone)}</p>` : ""}<h2>${escape(types[order.saleType] || "Pedido")} #${escape(order.number)}</h2><p class="muted">DOCUMENTO NÃO FISCAL</p></header>
  <div class="meta"><div><p>Cliente: <strong>${escape(order.customerName)}</strong></p><p>Vendedor: ${escape(order.sellerName)}</p></div><div><p>Data: ${escape(new Date(order.completedAt || order.createdAt).toLocaleString("pt-BR"))}</p><p>Situação: ${escape(order.status.replaceAll("_", " "))}</p></div></div>
  <table><thead><tr><th>Código</th><th>Produto / variação</th><th class="number">Qtd.</th><th class="number">Unitário</th><th class="number">Total</th></tr></thead><tbody>${items}</tbody></table>${returned}
  <div class="totals"><p><span>Subtotal</span><span>${money(order.subtotal)}</span></p><p><span>Desconto</span><span>${money(order.discount)}</span></p><p><span>Acréscimo</span><span>${money(order.addition)}</span></p><p class="total"><span>${order.saleType === "TROCA" ? "Diferença" : "Total"}</span><span>${money(order.total)}</span></p></div>
  ${financial ? `<h3>${Number(order.total) < 0 ? "Tratamento da diferença" : "Forma de pagamento"}</h3>${Number(order.total) < 0 && order.returnDisposition === "CREDIT" ? "<p>Diferença lançada como crédito do cliente.</p>" : payments.map(([method, value]) => `<p>${escape(methods[String(method)] || method)}: <strong>${money(Math.abs(Number(value)))}</strong></p>`).join("")}${order.installments && payments.some(([method, value]) => method === "CREDIARIO" && Number(value) > 0) ? `<p>Crediário em ${escape(order.installments)} parcela(s).</p>` : ""}${cash}` : "<p>Este documento não comprova recebimento de pagamento.</p>"}
  ${cardDetails}${order.notes ? `<p class="notes"><strong>Observações</strong><br>${escape(order.notes)}</p>` : ""}<footer>Guarde este comprovante para apresentar em caso de troca.<br>Documento emitido pelo Contrx.</footer></main></body></html>`;
}
