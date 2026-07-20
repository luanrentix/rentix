/* eslint-disable @typescript-eslint/no-explicit-any */
import { Expense, ExpensePayment } from "./hooks/useExpenseCalculations";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number.isFinite(value) ? value : 0);
}

function formatDate(dateValue?: string) {
  if (!dateValue) return "-";
  try {
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR", { timeZone: "UTC" });
  } catch {
    return "-";
  }
}

function escapeHtml(text?: string): string {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function generateExpensePaymentReceipt(params: {
  expense: Expense;
  paymentRecord: ExpensePayment;
  companySettings: any;
  getPaymentMethodLabel: (method: any) => string;
  setPaymentFormError: (msg: string) => void;
}) {
  const { expense, paymentRecord, companySettings, getPaymentMethodLabel, setPaymentFormError } = params;

  const receiptWindow = window.open(
    "",
    "_blank",
    `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${window.screen.width},height=${window.screen.height}`,
  );

  if (!receiptWindow) {
    setPaymentFormError(
      "O pagamento foi realizado, mas não foi possível abrir o recibo. Verifique se o navegador bloqueou pop-ups.",
    );
    return;
  }

  receiptWindow.document.open();

  const companyName = companySettings.tradeName || companySettings.companyName || "Contrx";
  const companyDocument = companySettings.document || "Não informado";
  const companyPhone = companySettings.phone || "Não informado";
  const companyEmail = companySettings.email || "Não informado";
  const receiptNumber = String(paymentRecord.expenseId)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toUpperCase();
  
  const paymentMethods = paymentRecord.paymentItems?.length
    ? paymentRecord.paymentItems
        .map((paymentItem) => `${getPaymentMethodLabel(paymentItem.method)} - ${formatCurrency(paymentItem.amount)}`)
        .join(", ")
    : getPaymentMethodLabel(paymentRecord.method);

  const chargeLabel = expense.installmentNumber && expense.installmentTotal
    ? `Parcela ${expense.installmentNumber}/${expense.installmentTotal}`
    : "Despesa Única";

  const receiptDateTime = new Date(paymentRecord.paidAt).toLocaleString("pt-BR");
  const receiptDate = formatDate(paymentRecord.paidAt);
  const receiptObservation = paymentRecord.note?.trim() || "-";
  const hasObservation = receiptObservation !== "-";

  receiptWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Recibo de Pagamento (Despesa)</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; padding: 0; background: #f1f5f9; color: #0f172a; font-family: 'Outfit', Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 8px; padding: 10px 16px; background: #ffffff; border-bottom: 1px solid #e2e8f0; }
          .toolbar button { border: 0; border-radius: 6px; padding: 8px 14px; font-size: 11px; font-weight: 800; cursor: pointer; }
          .print-button { background: #0f766e; color: #ffffff; }
          .close-button { background: #f1f5f9; color: #0f172a; border: 1px solid #cbd5e1 !important; }
          .page { width: min(190mm, 95%); margin: 12px auto; }
          .receipt { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6mm 8mm; box-shadow: 0 4px 12px rgba(15,23,42,0.05); break-inside: avoid; page-break-inside: avoid; }
          .receipt-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 1.5px solid #0f766e; padding-bottom: 3mm; margin-bottom: 4mm; }
          .receipt-header .left h1 { margin: 0; font-size: 20px; font-weight: 900; color: #0f766e; text-transform: uppercase; letter-spacing: 0.05em; }
          .receipt-header .left span { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; }
          .receipt-header .right { text-align: right; font-size: 10px; color: #475569; }
          .receipt-header .right strong { font-size: 12px; color: #0f172a; }
          .info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-bottom: 4mm; }
          .info-item { background: #f8fafc; border: 1px solid #e2e8f0; padding: 6px 10px; border-radius: 4px; }
          .info-item span { display: block; font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
          .info-item strong { display: block; font-size: 11px; color: #0f172a; margin-top: 2px; }
          .values-table { width: 100%; border-collapse: collapse; margin-bottom: 4mm; }
          .values-table th { background: #f1f5f9; color: #475569; font-size: 9px; font-weight: 900; text-transform: uppercase; text-align: left; padding: 5px 8px; border: 1px solid #e2e8f0; }
          .values-table td { font-size: 11px; padding: 6px 8px; border: 1px solid #e2e8f0; color: #0f172a; }
          .values-table .total-th { background: #0f766e; color: #ffffff; }
          .values-table .total-td { background: #f0fdf4; color: #15803d; font-weight: 900; font-size: 13px; }
          .declaration { font-size: 9.5px; color: #475569; line-height: 1.4; margin: 0 0 5mm; text-align: justify; }
          .signature-area { display: grid; grid-template-columns: 1fr 1fr; gap: 15mm; margin-bottom: 4mm; }
          .signature { border-top: 1px solid #94a3b8; text-align: center; font-size: 10px; font-weight: 700; color: #334155; padding-top: 4px; }
          .signature small { display: block; color: #64748b; font-size: 8px; margin-top: 1px; }
          .footer { border-top: 1px dashed #e2e8f0; padding-top: 3px; font-size: 8px; color: #94a3b8; text-align: center; text-transform: uppercase; }
          @page { size: A5 landscape; margin: 5mm; }
          @media print {
            body { background: #ffffff; }
            .toolbar { display: none !important; }
            .page { width: 100%; margin: 0; padding: 0; }
            .receipt { border: 1px solid #cbd5e1; box-shadow: none; border-radius: 0; padding: 4mm 6mm; }
            .receipt + .receipt { page-break-before: always; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button class="print-button" type="button" id="print-receipt-button">Imprimir recibo</button>
          <button class="close-button" type="button" onclick="window.close()">Fechar</button>
        </div>

        <main class="page">
          <section class="receipt">
            <header class="receipt-header">
              <div class="left">
                <h1>Recibo de Pagamento</h1>
                <span>Comprovante de quitação de despesa</span>
              </div>
              <div class="right">
                Nº <strong>${escapeHtml(receiptNumber || "CONTRX")}</strong><br />
                Emitido em: <strong>${escapeHtml(receiptDateTime)}</strong>
              </div>
            </header>

            <div class="info-grid">
              <div class="info-item"><span>Favorecido (Recebedor)</span><strong>${escapeHtml(expense.personName || "Fornecedor")}</strong></div>
              <div class="info-item"><span>Imóvel / Centro de Custo</span><strong>${escapeHtml(expense.propertyName || "Geral / Administrativo")}</strong></div>
              <div class="info-item"><span>Forma de Pagamento</span><strong>${escapeHtml(paymentMethods)}</strong></div>
              <div class="info-item"><span>Descrição da Despesa</span><strong>${escapeHtml(expense.description)} (${escapeHtml(chargeLabel)})</strong></div>
            </div>

            <table class="values-table">
              <thead>
                <tr>
                  <th>Valor Nominal</th>
                  <th>Juros/Multa (+)</th>
                  <th>Desconto (-)</th>
                  <th class="total-th">Valor Pago</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${formatCurrency(expense.amount)}</td>
                  <td>${formatCurrency(paymentRecord.interest)}</td>
                  <td>${formatCurrency(paymentRecord.discount)}</td>
                  <td class="total-td">${formatCurrency(paymentRecord.amountPaid)}</td>
                </tr>
              </tbody>
            </table>

            ${hasObservation ? `<div style="margin-bottom: 4mm; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 10px; border-radius: 4px; font-size: 10px;"><span style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase;">Observação:</span> ${escapeHtml(receiptObservation)}</div>` : ""}

            <p class="declaration">
              Efetuamos o pagamento do valor acima descrito, dando plena quitação da obrigação correspondente a este lançamento.
            </p>

            <div class="signature-area">
              <div class="signature">
                ${escapeHtml(companyName)}
                <small>Pagador (Emissor)</small>
              </div>
              <div class="signature">
                Assinatura / Conferência do Credor
                <small>Favorecido (Recebedor)</small>
              </div>
            </div>

            <div class="footer">
              ${escapeHtml(companyName)} · Documento: ${escapeHtml(companyDocument)} · Tel: ${escapeHtml(companyPhone)} · E-mail: ${escapeHtml(companyEmail)}
            </div>
          </section>
        </main>

        <script>
          document.getElementById("print-receipt-button").addEventListener("click", function () {
            window.print();
          });
        </script>
      </body>
    </html>
  `);

  receiptWindow.document.close();
}
