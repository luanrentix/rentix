/* eslint-disable @typescript-eslint/no-explicit-any */
import QRCode from "qrcode";

export interface Charge {
  id: string;
  contractId?: string | number | null;
  tenantId?: string | null;
  property: string;
  tenant: string;
  dueDate: string;
  amount: number;
  status: "Pending" | "Paid" | "Overdue";
  paidAmount?: number;
  remainingAmount?: number;
  manual?: boolean;
  issueDate?: string;
  installmentNumber?: number;
  installmentTotal?: number;
  installmentGroupId?: string;
  isDownPayment?: boolean;
}

export interface ChargePayment {
  id?: string;
  chargeId: string;
  paidAt: string;
  method: string;
  paymentItems?: Array<{ method: string; amount: number }>;
  interest: number;
  discount: number;
  amountPaid: number;
  note?: string;
}

export interface ReceiptPrintItem {
  charge: Charge;
  paymentRecord: ChargePayment;
}

export interface Contract {
  id: string | number;
  propertyId: string | number;
  tenantId: string | number;
  propertyName?: string;
  tenantName?: string;
  startDate: string;
  endDate?: string;
  isTemporaryRental?: boolean;
  checkInTime?: string;
  checkOutTime?: string;
}

export function escapeHtml(value?: string | number | null): string {
  if (value === undefined || value === null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function formatDate(value?: string | null): string {
  if (!value) return "-";
  try {
    const cleanDate = value.split("T")[0];
    const [year, month, day] = cleanDate.split("-");
    if (!year || !month || !day) return "-";
    return `${day}/${month}/${year}`;
  } catch {
    return "-";
  }
}

export function formatCurrency(value?: number | null): string {
  if (value === undefined || value === null) return "R$ 0,00";
  return value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

function calculatePixCrc16(payload: string): string {
  const polynomial = 0x1021;
  let result = 0xffff;

  if (payload.length > 0) {
    for (let offset = 0; offset < payload.length; offset++) {
      const b = payload.charCodeAt(offset);
      for (let i = 0; i < 8; i++) {
        const bit = ((b >> (7 - i)) & 1) === 1;
        const c15 = ((result >> 15) & 1) === 1;
        result <<= 1;
        if (c15 !== bit) {
          result ^= polynomial;
        }
      }
    }
  }

  result &= 0xffff;
  return result.toString(16).toUpperCase().padStart(4, "0");
}

function formatEmvField(id: string, value: string): string {
  return id + String(value.length).padStart(2, "0") + value;
}

function generatePixPayload(params: {
  pixKey: string;
  pixKeyType: string;
  merchantName: string;
  merchantCity: string;
  amount: number;
  txId: string;
  description?: string;
}): string {
  const { pixKey, merchantName, merchantCity, amount, txId, description } = params;

  if (!pixKey) return "";

  const formattedAmount = amount.toFixed(2);
  const cleanMerchantName = merchantName
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .slice(0, 25);
  const cleanMerchantCity = merchantCity
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9 ]/g, "")
    .slice(0, 15);
  const cleanTxId = txId.replace(/[^a-zA-Z0-9]/g, "").slice(0, 25) || "***";

  let merchantAccountInfo = formatEmvField("00", "br.gov.bcb.pix");
  merchantAccountInfo += formatEmvField("01", pixKey);

  if (description) {
    const cleanDesc = description
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9 ]/g, "")
      .slice(0, 25);
    merchantAccountInfo += formatEmvField("02", cleanDesc);
  }

  const additionalDataField = formatEmvField("05", cleanTxId);

  const payloadWithoutCrc =
    formatEmvField("00", "01") +
    formatEmvField("01", "12") +
    formatEmvField("26", merchantAccountInfo) +
    formatEmvField("52", "0000") +
    formatEmvField("53", "986") +
    formatEmvField("54", formattedAmount) +
    formatEmvField("58", "BR") +
    formatEmvField("59", cleanMerchantName) +
    formatEmvField("60", cleanMerchantCity) +
    formatEmvField("62", additionalDataField) +
    "6304";

  return `${payloadWithoutCrc}${calculatePixCrc16(payloadWithoutCrc)}`;
}

async function getPixQrCodeDataUrl(pixPayload: string): Promise<string> {
  try {
    return await QRCode.toDataURL(pixPayload, {
      errorCorrectionLevel: "M",
      margin: 2,
      width: 180,
    });
  } catch (error) {
    console.warn("Não foi possível gerar QR Code Pix localmente.", error);
    return "";
  }
}

export async function generatePaymentCarnet(params: {
  carnetCharges: Charge[];
  companySettings: any;
  paymentBookletInstructions: string;
  renderPaymentBookletTemplate: (instructions: string, data: Record<string, string>) => string;
  renderPaymentBookletInstructions: (content: string) => string;
  setChargeFormError: (msg: string) => void;
}) {
  const {
    carnetCharges,
    companySettings,
    paymentBookletInstructions,
    renderPaymentBookletTemplate,
    renderPaymentBookletInstructions,
    setChargeFormError,
  } = params;

  if (carnetCharges.length === 0) return;

  const printWindow = window.open(
    "",
    "_blank",
    `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${window.screen.width},height=${window.screen.height}`,
  );

  if (!printWindow) {
    setChargeFormError(
      "As parcelas foram salvas, mas não foi possível abrir o carnê. Verifique se o navegador bloqueou pop-ups.",
    );
    return;
  }

  const companyName = companySettings.tradeName || companySettings.companyName || "Contrx";
  const companyDocument = companySettings.document || "Não informado";
  const companyPhone = companySettings.phone || "Não informado";
  const companyEmail = companySettings.email || "Não informado";
  const pixKeyType = companySettings.pixKeyType || "Pix";
  const pixKey = companySettings.pixKey || "Não cadastrada";
  const firstCharge = carnetCharges[0];
  const totalAmount = carnetCharges.reduce((total, charge) => total + charge.amount, 0);

  const rows = carnetCharges
    .map(
      (charge) => `
        <tr>
          <td>${charge.installmentNumber || 1}/${charge.installmentTotal || carnetCharges.length}</td>
          <td>${escapeHtml(charge.tenant)}</td>
          <td>${escapeHtml(charge.property)}</td>
          <td>${formatDate(charge.dueDate)}</td>
          <td>${formatCurrency(charge.amount)}</td>
        </tr>
      `,
    )
    .join("");

  const vouchers = (
    await Promise.all(
      carnetCharges.map(async (charge) => {
        const installmentLabel = `${charge.installmentNumber || 1}/${
          charge.installmentTotal || carnetCharges.length
        }`;
        const pixPayload = generatePixPayload({
          pixKey: companySettings.pixKey || "",
          pixKeyType,
          merchantName: companyName,
          merchantCity: companySettings.city || "Brasil",
          amount: charge.amount,
          txId: `RX${String(charge.installmentGroupId || charge.id)
            .replace(/[^a-zA-Z0-9]/g, "")
            .slice(-18)}${String(charge.installmentNumber || 1).padStart(2, "0")}`,
          description: `Aluguel ${installmentLabel} ${charge.tenant}`,
        });
        const pixQrCodeDataUrl = pixPayload ? await getPixQrCodeDataUrl(pixPayload) : "";
        const paymentBookletContent = renderPaymentBookletTemplate(
          paymentBookletInstructions,
          {
            companyName,
            tradeName: companyName,
            personName: charge.tenant,
            tenantName: charge.tenant,
            propertyName: charge.property,
            contractNumber: String(charge.contractId || firstCharge.contractId || "SEM CONTRATO"),
            installmentNumber: installmentLabel,
            dueDate: formatDate(charge.dueDate),
            amount: formatCurrency(charge.amount),
            pixKey,
            currentDate: new Date().toLocaleDateString("pt-BR"),
          },
        );

        return `
          <section class="voucher">
            <div class="voucher-header">
              <div>
                <div class="brand">${escapeHtml(companyName)}</div>
                <h2>Carnê de pagamento</h2>
              </div>
              <div class="installment-badge">
                <span>Parcela</span>
                <strong>${installmentLabel}</strong>
              </div>
            </div>

            <div class="payer-card">
              <div>
                <span>Pagador</span>
                <strong>${escapeHtml(charge.tenant)}</strong>
              </div>
              <div>
                <span>Bem/Ativo</span>
                <strong>${escapeHtml(charge.property)}</strong>
              </div>
            </div>

            <div class="amount-strip">
              <div>
                <span>Vencimento</span>
                <strong>${formatDate(charge.dueDate)}</strong>
              </div>
              <div>
                <span>Valor</span>
                <strong>${formatCurrency(charge.amount)}</strong>
              </div>
            </div>

            <div class="pix-area">
              <div class="pix-info">
                <div class="pix-heading">
                  <span>Pagamento via Pix</span>
                  <strong>${escapeHtml(pixKey)}</strong>
                  <small>Tipo da chave: ${escapeHtml(pixKeyType || "Não informado")}</small>
                </div>
                ${
                  pixPayload
                    ? `<div class="pix-copy"><span>Pix copia e cola</span><p>${escapeHtml(pixPayload)}</p></div>`
                    : `<div class="pix-warning">Cadastre a chave Pix da empresa para gerar o QR Code automático.</div>`
                }
              </div>
              ${
                pixQrCodeDataUrl
                  ? `<div class="pix-qr"><img src="${pixQrCodeDataUrl}" alt="QR Code Pix" /><span>QR Code Pix</span></div>`
                  : pixPayload
                    ? `<div class="pix-qr pix-qr-error"><span>QR Code indisponivel</span></div>`
                    : ""
              }
            </div>

            ${renderPaymentBookletInstructions(paymentBookletContent)}

            <div class="voucher-footer">
              <span>${escapeHtml(companyName)} · Documento: ${escapeHtml(companyDocument)}</span>
              <span>Telefone: ${escapeHtml(companyPhone)} · E-mail: ${escapeHtml(companyEmail)}</span>
            </div>
          </section>
        `;
      }),
    )
  ).join("");

  printWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Carnê de Pagamento</title>
        <link rel="preconnect" href="https://fonts.googleapis.com">
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
        <style>
          * { box-sizing: border-box; }
          body { margin: 0; background: #eef2f7; color: #172033; font-family: 'Outfit', Arial, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; background: rgba(255, 255, 255, 0.97); border-bottom: 1px solid #d8dee8; backdrop-filter: blur(10px); }
          .toolbar button { border: 0; border-radius: 8px; padding: 11px 18px; font-size: 12px; font-weight: 900; cursor: pointer; }
          .print-button { background: #0f766e; color: #ffffff; }
          .close-button { background: #f8fafc; color: #172033; border: 1px solid #cbd5e1 !important; }
          @page { size: A4; margin: 7mm; }
          .page { width: min(1080px, calc(100% - 28px)); margin: 14px auto; }
          .voucher-list { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
          .summary { margin-bottom: 12px; border: 1px solid #cbd5e1; border-radius: 8px; background: #ffffff; padding: 16px; box-shadow: 0 14px 32px rgba(15, 23, 42, 0.08); }
          .summary-header { display: grid; grid-template-columns: 1fr auto; gap: 14px; border-bottom: 2px solid #172033; padding-bottom: 9px; }
          .brand { color: #0f766e; font-size: 9.5px; font-weight: 900; letter-spacing: 0.14em; text-transform: uppercase; }
          h1, h2 { margin: 5px 0 0; color: #172033; letter-spacing: 0; }
          h1 { font-size: 22px; text-transform: uppercase; }
          h2 { font-size: 14px; }
          .summary p { margin: 5px 0 0; font-size: 11px; }
          .summary-meta { color: #475569; font-size: 11px; line-height: 1.55; text-align: right; }
          table { width: 100%; border-collapse: collapse; margin-top: 10px; }
          th { background: #172033; color: #ffffff; font-size: 9px; text-transform: uppercase; letter-spacing: 0.06em; }
          th, td { border: 1px solid #d8dee8; padding: 5px 6px; font-size: 10px; text-align: left; }
          tbody tr:nth-child(even) td { background: #f8fafc; }
          .voucher { position: relative; overflow: hidden; break-inside: avoid; page-break-inside: avoid; border: 2px dashed #94a3b8; border-radius: 8px; background: #ffffff; padding: 12px; min-height: 286px; margin-bottom: 20px; }
          .voucher::before { content: ""; position: absolute; inset: 0 auto 0 0; width: 4px; background: #0f766e; }
          .voucher-header { display: grid; grid-template-columns: 1fr auto; align-items: start; gap: 10px; border-bottom: 1.5px solid #172033; padding: 0 0 8px 7px; }
          .voucher-header h2 { text-transform: uppercase; }
          .installment-badge { min-width: 74px; border: 1px solid #172033; background: #f8fafc; color: #172033; padding: 5px 8px; text-align: center; white-space: nowrap; }
          .installment-badge span { display: block; color: #64748b; font-size: 7.5px; font-weight: 900; letter-spacing: 0.1em; text-transform: uppercase; }
          .installment-badge strong { display: block; margin-top: 1px; font-size: 13px; line-height: 1; }
          .payer-card { display: grid; grid-template-columns: 1fr; gap: 5px; margin: 8px 0 0 7px; padding: 8px 9px; border: 1px solid #d8dee8; background: #f8fafc; }
          .payer-card span, .amount-strip span, .pix-heading span, .pix-copy span { display: block; color: #64748b; font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
          .payer-card strong { display: block; margin-top: 2px; color: #172033; font-size: 10.5px; line-height: 1.2; text-transform: uppercase; }
          .amount-strip { display: grid; grid-template-columns: 1fr 1fr; gap: 0; margin: 7px 0 0 7px; border: 1px solid #172033; background: #172033; }
          .amount-strip div { background: #ffffff; padding: 7px 9px; }
          .amount-strip div + div { border-left: 1px solid #172033; }
          .amount-strip strong { display: block; margin-top: 2px; color: #172033; font-size: 14px; line-height: 1.1; }
          .pix-area { display: grid; grid-template-columns: minmax(0, 1fr) 112px; gap: 8px; margin: 8px 0 0 7px; border: 1px solid #d8dee8; background: #ffffff; padding: 8px; }
          .pix-info { min-width: 0; display: flex; flex-direction: column; gap: 6px; }
          .pix-heading { display: grid; grid-template-columns: 1fr; gap: 2px; }
          .pix-heading span { color: #0f766e; }
          .pix-heading strong { display: block; color: #172033; font-size: 12px; line-height: 1.1; }
          .pix-heading small { display: block; color: #64748b; font-size: 7.6px; font-weight: 800; }
          .pix-copy { border: 1px dashed #a7b2c1; background: #f8fafc; padding: 6px; }
          .pix-copy span { color: #0f766e; }
          .pix-copy p { margin: 3px 0 0; color: #172033; font-family: "Courier New", monospace; font-size: 5.8px; line-height: 1.28; word-break: break-all; }
          .pix-warning { border: 1px solid #fbbf24; background: #fffbeb; color: #92400e; padding: 6px; font-size: 8px; font-weight: 800; }
          .pix-qr { display: flex; flex-direction: column; align-items: center; justify-content: center; background: #f8fafc; padding: 6px; border: 1px solid #d8dee8; min-height: 124px; }
          .pix-qr img { width: 98px; height: 98px; object-fit: contain; background: #ffffff; }
          .pix-qr span { margin-top: 4px; color: #172033; font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.05em; }
          .instructions { margin: 8px 0 0 7px; border: 1px solid #d8dee8; border-left: 4px solid #0f766e; background: #ffffff; padding: 7px 8px; }
          .instructions span { display: block; margin-bottom: 4px; color: #0f766e; font-size: 7.5px; font-weight: 900; text-transform: uppercase; letter-spacing: 0.08em; }
          .instructions p { margin: 1px 0; color: #475569; font-size: 7.4px; line-height: 1.25; font-weight: 700; }
          .voucher-footer { display: grid; grid-template-columns: 1fr; gap: 2px; margin: 7px 0 0 7px; border-top: 1px solid #d8dee8; padding-top: 5px; color: #64748b; font-size: 7.3px; font-weight: 700; }
          @media print {
            body { background: #ffffff; }
            .toolbar { display: none !important; }
            .page { width: 100%; margin: 0; padding: 0; }
            .summary { box-shadow: none; border-radius: 0; }
            .voucher { margin-bottom: 10px; }
          }
        </style>
      </head>
      <body>
        <div class="toolbar">
          <button class="print-button" type="button" onclick="window.print()">Imprimir carnê</button>
          <button class="close-button" type="button" onclick="window.close()">Fechar</button>
        </div>

        <main class="page">
          <section class="summary">
            <div class="summary-header">
              <div>
                <div class="brand">${escapeHtml(companyName)} · Financeiro</div>
                <h1>Carnê de Pagamento</h1>
                <p>Inquilino: <strong>${escapeHtml(firstCharge.tenant)}</strong></p>
                <p>Bem/Ativo: <strong>${escapeHtml(firstCharge.property)}</strong></p>
              </div>
              <div class="summary-meta">
                Parcelas: <strong>${carnetCharges.length}</strong><br />
                Total: <strong>${formatCurrency(totalAmount)}</strong><br />
                Gerado em: <strong>${new Date().toLocaleString("pt-BR")}</strong>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Parcela</th>
                  <th>Inquilino</th>
                  <th>Bem/Ativo</th>
                  <th>Vencimento</th>
                  <th>Valor</th>
                </tr>
              </thead>
              <tbody>${rows}</tbody>
            </table>
          </section>

          <div class="voucher-list">
            ${vouchers}
          </div>
        </main>

        <script>
          window.onload = function () {
            window.focus();
            try {
              window.moveTo(0, 0);
              window.resizeTo(screen.availWidth, screen.availHeight);
            } catch (error) {}
          };
        </script>
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();

  try {
    printWindow.moveTo(0, 0);
    printWindow.resizeTo(window.screen.availWidth, window.screen.availHeight);
  } catch {}
}

export function openAccountsReceivableReport(params: {
  shouldPrint: boolean;
  reportDueFilter: string;
  reportStartDate: string;
  reportEndDate: string;
  reportTenantId: string | number;
  reportStatusFilter: string;
  reportCharges: Charge[];
  tenants: any[];
  getChargeRemainingAmount: (charge: Charge) => number;
  getChargePaidAmount: (charge: Charge) => number;
  getReportTotalAmount: (charges: Charge[]) => number;
  getPaymentMethodLabel: (method: any) => string;
  getStatusLabel: (status: any) => string;
  getStatusFilterLabel: (filter: any) => string;
  getReportDueFilterLabel: (filter: any) => string;
  paymentRecords: ChargePayment[];
  setReportFormError: (msg: string) => void;
  onShare?: () => Promise<any>;
}) {
  const {
    shouldPrint,
    reportDueFilter,
    reportStartDate,
    reportEndDate,
    reportTenantId,
    reportStatusFilter,
    reportCharges,
    tenants,
    getChargeRemainingAmount,
    getChargePaidAmount,
    getReportTotalAmount,
    getPaymentMethodLabel,
    getStatusLabel,
    getStatusFilterLabel,
    getReportDueFilterLabel,
    paymentRecords,
    setReportFormError,
    onShare,
  } = params;

  const selectedReportTenant = tenants.find((tenant) => String(tenant.id) === String(reportTenantId));
  const pendingTotal = reportCharges
    .filter((charge) => charge.status === "Pending")
    .reduce((total, charge) => total + getChargeRemainingAmount(charge), 0);
  const paidTotal = reportCharges
    .filter((charge) => charge.status === "Paid")
    .reduce((total, charge) => total + getChargePaidAmount(charge), 0);
  const overdueTotal = reportCharges
    .filter((charge) => charge.status === "Overdue")
    .reduce((total, charge) => total + getChargeRemainingAmount(charge), 0);
  const grandTotal = getReportTotalAmount(reportCharges);

  const filterSummary = [
    `Pessoa: ${selectedReportTenant?.name || "Todas"}`,
    `Status: ${getStatusFilterLabel(reportStatusFilter)}`,
    `Vencimento: ${getReportDueFilterLabel(reportDueFilter)}`,
    reportDueFilter === "DateRange" && reportStartDate ? `De: ${formatDate(`${reportStartDate}T00:00:00`)}` : "",
    reportDueFilter === "DateRange" && reportEndDate ? `Até: ${formatDate(`${reportEndDate}T00:00:00`)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  const rows = reportCharges
    .map((charge) => {
      const payment = paymentRecords.find((p) => String(p.chargeId) === String(charge.id));
      const amount = charge.status === "Paid" ? getChargePaidAmount(charge) : getChargeRemainingAmount(charge);
      const paymentMethods = payment?.paymentItems?.length
        ? payment.paymentItems
            .map((item) => `${getPaymentMethodLabel(item.method)} (${formatCurrency(item.amount)})`)
            .join(", ")
        : payment
          ? getPaymentMethodLabel(payment.method)
          : "-";

      return `
        <tr>
          <td>${escapeHtml(charge.property)}</td>
          <td>${escapeHtml(charge.tenant)}</td>
          <td>${formatDate(charge.dueDate)}</td>
          <td>${formatCurrency(amount)}</td>
          <td>${getStatusLabel(charge.status)}</td>
          <td>${payment?.paidAt ? formatDate(payment.paidAt) : "-"}</td>
          <td>${escapeHtml(paymentMethods)}</td>
        </tr>
      `;
    })
    .join("");

  const reportWindow = window.open("", "_blank", "width=1200,height=800");

  if (!reportWindow) {
    setReportFormError("Não foi possível abrir o relatório. Verifique se o navegador bloqueou pop-ups.");
    return;
  }

  (reportWindow as any).handleShareReceivableReport = async () => {
    if (onShare) {
      await onShare();
    }
  };

  reportWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Relatório de Contas a Receber</title>
        <style>
          * { box-sizing: border-box; }
          body { font-family: Arial, sans-serif; margin: 0; color: #0f172a; background: #f1f5f9; }
          .report-toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 10px; padding: 14px 24px; background: rgba(255, 255, 255, 0.96); border-bottom: 1px solid #e2e8f0; backdrop-filter: blur(10px); }
          .toolbar-button { border: 0; border-radius: 12px; padding: 11px 18px; font-size: 13px; font-weight: 800; cursor: pointer; transition: 0.2s ease; }
          .toolbar-button.print { background: #059669; color: #ffffff; box-shadow: 0 8px 18px rgba(5, 150, 105, 0.2); }
          .toolbar-button.print:hover { background: #047857; }
          .toolbar-button.share { background: #f97316; color: #ffffff; box-shadow: 0 8px 18px rgba(249, 115, 22, 0.2); }
          .toolbar-button.share:hover { background: #ea580c; }
          .toolbar-button.close { background: #e2e8f0; color: #0f172a; }
          .toolbar-button.close:hover { background: #cbd5e1; }
          .report-page { width: min(1180px, calc(100% - 48px)); margin: 28px auto; padding: 32px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 18px; box-shadow: 0 24px 70px rgba(15, 23, 42, 0.12); }
          .header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 2px solid #e2e8f0; padding-bottom: 18px; }
          .brand { font-size: 13px; font-weight: 700; color: #ea580c; text-transform: uppercase; letter-spacing: 0.08em; }
          h1 { margin: 6px 0 0; font-size: 26px; }
          .meta { margin-top: 8px; font-size: 12px; color: #64748b; line-height: 1.6; }
          .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin: 22px 0; }
          .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 14px; background: #f8fafc; }
          .card span { display: block; font-size: 11px; color: #64748b; font-weight: 700; text-transform: uppercase; }
          .card strong { display: block; margin-top: 6px; font-size: 16px; }
          table { width: 100%; border-collapse: collapse; margin-top: 16px; }
          th { background: #fff7ed; color: #0f172a; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
          th, td { border: 1px solid #e2e8f0; padding: 9px; font-size: 12px; vertical-align: top; }
          tr:nth-child(even) td { background: #f8fafc; }
          .footer { margin-top: 24px; font-size: 11px; color: #64748b; text-align: center; }
          @media print {
            body { margin: 0; background: #ffffff; }
            .no-print { display: none !important; }
            .report-page { width: 100%; margin: 0; padding: 18px; border: 0; border-radius: 0; box-shadow: none; }
            .summary { grid-template-columns: repeat(4, 1fr); }
          }
        </style>
        <script>
          async function shareReport() {
            const btn = document.querySelector('.toolbar-button.share');
            if (btn) {
              btn.disabled = true;
              btn.textContent = 'Gerando...';
            }
            try {
              if (window.handleShareReceivableReport) {
                await window.handleShareReceivableReport();
              } else {
                alert('Função de compartilhamento não disponível nesta janela.');
              }
            } catch (err) {
              console.error(err);
              alert('Erro: ' + (err.message || err));
            } finally {
              if (btn) {
                btn.disabled = false;
                btn.textContent = 'Compartilhar link';
              }
            }
          }
        </script>
      </head>
      <body>
        <div class="report-toolbar no-print">
          <button class="toolbar-button share" type="button" onclick="shareReport()">Compartilhar link</button>
          <button class="toolbar-button print" type="button" onclick="window.print()">Imprimir</button>
          <button class="toolbar-button close" type="button" onclick="window.close()">Fechar relatório</button>
        </div>

        <main class="report-page">
        <div class="header">
          <div>
            <div class="brand">Contrx · Financeiro</div>
            <h1>Relatório de Contas a Receber</h1>
            <div class="meta">${escapeHtml(filterSummary)}</div>
          </div>
          <div class="meta">
            Gerado em:<br />
            <strong>${new Date().toLocaleString("pt-BR")}</strong>
          </div>
        </div>

        <div class="summary">
          <div class="card"><span>Quantidade</span><strong>${reportCharges.length}</strong></div>
          <div class="card"><span>Total geral</span><strong>${formatCurrency(grandTotal)}</strong></div>
          <div class="card"><span>Total pago</span><strong>${formatCurrency(paidTotal)}</strong></div>
          <div class="card"><span>Total vencido</span><strong>${formatCurrency(overdueTotal)}</strong></div>
        </div>

        <div class="summary">
          <div class="card"><span>Total pendente</span><strong>${formatCurrency(pendingTotal)}</strong></div>
          <div class="card"><span>Status</span><strong>${getStatusFilterLabel(reportStatusFilter)}</strong></div>
          <div class="card"><span>Vencimento</span><strong>${getReportDueFilterLabel(reportDueFilter)}</strong></div>
          <div class="card"><span>Pessoa</span><strong>${escapeHtml(selectedReportTenant?.name || "Todas")}</strong></div>
        </div>

        <table>
          <thead>
            <tr>
              <th>Bem/Ativo</th>
              <th>Inquilino/Pessoa</th>
              <th>Vencimento</th>
              <th>Valor</th>
              <th>Status</th>
              <th>Pagamento</th>
              <th>Forma de pagamento</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>

        <div class="footer">Relatório gerado pelo módulo Contas a Receber do Contrx.</div>
        </main>
        ${
          shouldPrint
            ? `<script>
          window.onload = function () {
            window.focus();
            window.print();
          };
        </script>`
            : ""
        }
      </body>
    </html>
  `);
  reportWindow.document.close();
}

export function buildConfiguredContractPrintHtml(templateContent: string, templateData: Record<string, string>): string {
  const renderedTemplateContent = Object.entries(templateData).reduce((renderedContent, [key, value]) => {
    return renderedContent.replace(new RegExp(`{${key}}`, "g"), value);
  }, templateContent);

  return `<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Contrato</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    @page { size: A4; margin: 0; }
    * { box-sizing: border-box; }
    body { margin: 0; background: #eef2f7; color: #111827; font-family: 'Outfit', Arial, Helvetica, sans-serif; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .toolbar { position: sticky; top: 0; z-index: 10; display: flex; justify-content: flex-end; gap: 12px; padding: 14px 18px; background: #ffffff; border-bottom: 1px solid #e5e7eb; }
    .toolbar button { border: 0; border-radius: 12px; padding: 12px 18px; font-weight: 800; cursor: pointer; }
    .print-button { background: #f97316; color: #ffffff; }
    .close-button { background: #f1f5f9; color: #334155; }
    .page { width: 210mm; min-height: 297mm; margin: 18px auto; background: #ffffff; box-shadow: 0 18px 40px rgba(15, 23, 42, 0.12); }
    .page-inner { padding: 18mm; }
    .content { white-space: pre-wrap; font-size: 12.5px; line-height: 1.65; font-weight: 600; }
    @media print {
      body { background: #ffffff; }
      .toolbar { display: none; }
      .page { width: 210mm; min-height: 297mm; margin: 0; box-shadow: none; }
      .page-inner { padding: 18mm; }
    }
  </style>
</head>
<body>
  <div class="toolbar">
    <button class="close-button" type="button" onclick="window.close()">Fechar</button>
    <button class="print-button" type="button" onclick="window.print()">Imprimir contrato</button>
  </div>

  <main class="page">
    <div class="page-inner">
      <div class="content">${escapeHtml(renderedTemplateContent)}</div>
    </div>
  </main>
</body>
</html>`;
}

export function openContractPrintWindow(htmlContent: string, setChargeFormError: (msg: string) => void): boolean {
  const printWindow = window.open(
    "",
    "_blank",
    `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${window.screen.width},height=${window.screen.height}`,
  );

  if (!printWindow) {
    setChargeFormError("Não foi possível abrir o contrato. Verifique se o navegador bloqueou pop-ups.");
    return false;
  }

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  printWindow.focus();

  try {
    printWindow.moveTo(0, 0);
    printWindow.resizeTo(window.screen.availWidth, window.screen.availHeight);
  } catch {}

  return true;
}

export function generatePaymentReceiptBatch(params: {
  receiptItems: ReceiptPrintItem[];
  companySettings: any;
  getPaymentMethodLabel: (method: any) => string;
  setPaymentFormError: (msg: string) => void;
}) {
  const { receiptItems, companySettings, getPaymentMethodLabel, setPaymentFormError } = params;

  if (receiptItems.length === 0) return;

  const receiptWindow = window.open(
    "",
    "_blank",
    `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${window.screen.width},height=${window.screen.height}`,
  );

  if (!receiptWindow) {
    setPaymentFormError("Não foi possível abrir os recibos. Verifique se o navegador bloqueou pop-ups.");
    return;
  }

  receiptWindow.document.open();

  const companyName = companySettings.tradeName || companySettings.companyName || "Contrx";
  const companyDocument = companySettings.document || "Não informado";
  const companyPhone = companySettings.phone || "Não informado";
  const companyEmail = companySettings.email || "Não informado";

  const receipts = receiptItems
    .map(({ charge, paymentRecord }) => {
      const receiptNumber = String(paymentRecord.chargeId)
        .replace(/[^a-zA-Z0-9]/g, "")
        .slice(-8)
        .toUpperCase();
      const paymentMethods = paymentRecord.paymentItems?.length
        ? paymentRecord.paymentItems
            .map((paymentItem) => `${getPaymentMethodLabel(paymentItem.method)} - ${formatCurrency(paymentItem.amount)}`)
            .join(", ")
        : getPaymentMethodLabel(paymentRecord.method);
      const chargeLabel = charge.isDownPayment
        ? "Entrada"
        : charge.installmentNumber && charge.installmentTotal
          ? `Parcela ${charge.installmentNumber}/${charge.installmentTotal}`
          : "Cobrança";
      const receiptDateTime = new Date(paymentRecord.paidAt).toLocaleString("pt-BR");
      const receiptObservation = paymentRecord.note?.trim() || "";

      return `
        <section class="receipt">
          <header class="receipt-header">
            <div class="left">
              <h1>Recibo de Pagamento</h1>
              <span>Comprovante de recebimento</span>
            </div>
            <div class="right">
              Nº <strong>${escapeHtml(receiptNumber || "CONTRX")}</strong><br />
              Emitido em: <strong>${escapeHtml(receiptDateTime)}</strong>
            </div>
          </header>

          <div class="info-grid">
            <div class="info-item"><span>Pagador (Inquilino)</span><strong>${escapeHtml(charge.tenant)}</strong></div>
            <div class="info-item"><span>Referência (Imóvel)</span><strong>${escapeHtml(charge.property)}</strong></div>
            <div class="info-item"><span>Forma de Pagamento</span><strong>${escapeHtml(paymentMethods)}</strong></div>
            <div class="info-item"><span>Contrato / Parcela</span><strong>${escapeHtml(chargeLabel)}</strong></div>
          </div>

          <table class="values-table">
            <thead>
              <tr>
                <th>Valor Original</th>
                <th>Juros/Multa (+)</th>
                <th>Desconto (-)</th>
                <th class="total-th">Total Pago</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>${formatCurrency(charge.amount)}</td>
                <td>${formatCurrency(paymentRecord.interest)}</td>
                <td>${formatCurrency(paymentRecord.discount)}</td>
                <td class="total-td">${formatCurrency(paymentRecord.amountPaid)}</td>
              </tr>
            </tbody>
          </table>

          ${receiptObservation ? `<div style="margin-bottom: 4mm; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 10px; border-radius: 4px; font-size: 10px;"><span style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase;">Observação:</span> ${escapeHtml(receiptObservation)}</div>` : ""}

          <p class="declaration">
            Declaramos o recebimento do valor acima descrito, referente à cobrança indicada neste comprovante.
            Este recibo é válido após a confirmação do pagamento.
          </p>

          <div class="signature-area">
            <div class="signature">${escapeHtml(companyName)}<small>Recebedor</small></div>
            <div class="signature">Assinatura / Conferência<small>Pagador</small></div>
          </div>

          <div class="footer">
            ${escapeHtml(companyName)} · Documento: ${escapeHtml(companyDocument)} · Tel: ${escapeHtml(companyPhone)} · E-mail: ${escapeHtml(companyEmail)}
          </div>
        </section>
      `;
    })
    .join("");

  receiptWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Recibos de Recebimento</title>
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
          .receipt { background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 6mm 8mm; box-shadow: 0 4px 12px rgba(15,23,42,0.05); break-inside: avoid; page-break-inside: avoid; margin-bottom: 12px; }
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
          <button class="print-button" type="button" id="print-receipt-button">Imprimir recibos</button>
          <button class="close-button" type="button" onclick="window.close()">Fechar</button>
        </div>
        <main class="page">${receipts}</main>
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

export function generatePaymentReceipt(params: {
  charge: Charge;
  paymentRecord: ChargePayment;
  companySettings: any;
  getPaymentMethodLabel: (method: any) => string;
  setPaymentFormError: (msg: string) => void;
}) {
  const { charge, paymentRecord, companySettings, getPaymentMethodLabel, setPaymentFormError } = params;

  const receiptWindow = window.open(
    "",
    "_blank",
    `toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${window.screen.width},height=${window.screen.height}`,
  );

  if (!receiptWindow) {
    setPaymentFormError(
      "O recebimento foi salvo, mas não foi possível abrir o recibo. Verifique se o navegador bloqueou pop-ups.",
    );
    return;
  }

  receiptWindow.document.open();

  const companyName = companySettings.tradeName || companySettings.companyName || "Contrx";
  const companyDocument = companySettings.document || "Não informado";
  const companyPhone = companySettings.phone || "Não informado";
  const companyEmail = companySettings.email || "Não informado";
  const receiptNumber = String(paymentRecord.chargeId)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-8)
    .toUpperCase();
  const paymentMethods = paymentRecord.paymentItems?.length
    ? paymentRecord.paymentItems
        .map((paymentItem) => `${getPaymentMethodLabel(paymentItem.method)} - ${formatCurrency(paymentItem.amount)}`)
        .join(", ")
    : getPaymentMethodLabel(paymentRecord.method);
  const chargeLabel = charge.isDownPayment
    ? "Entrada"
    : charge.installmentNumber && charge.installmentTotal
      ? `Parcela ${charge.installmentNumber}/${charge.installmentTotal}`
      : "Cobrança";
  const receiptDateTime = new Date(paymentRecord.paidAt).toLocaleString("pt-BR");
  const receiptDate = formatDate(paymentRecord.paidAt);
  const receiptObservation = paymentRecord.note?.trim() || "-";
  const hasObservation = receiptObservation !== "-";

  receiptWindow.document.write(`
    <!doctype html>
    <html lang="pt-BR">
      <head>
        <meta charset="utf-8" />
        <title>Recibo de Recebimento</title>
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
                <span>Comprovante de recebimento</span>
              </div>
              <div class="right">
                Nº <strong>${escapeHtml(receiptNumber || "CONTRX")}</strong><br />
                Emitido em: <strong>${escapeHtml(receiptDateTime)}</strong>
              </div>
            </header>

            <div class="info-grid">
              <div class="info-item"><span>Pagador (Inquilino)</span><strong>${escapeHtml(charge.tenant)}</strong></div>
              <div class="info-item"><span>Referência (Imóvel)</span><strong>${escapeHtml(charge.property)}</strong></div>
              <div class="info-item"><span>Forma de Pagamento</span><strong>${escapeHtml(paymentMethods)}</strong></div>
              <div class="info-item"><span>Contrato / Parcela</span><strong>${escapeHtml(chargeLabel)}</strong></div>
            </div>

            <table class="values-table">
              <thead>
                <tr>
                  <th>Valor Original</th>
                  <th>Juros/Multa (+)</th>
                  <th>Desconto (-)</th>
                  <th class="total-th">Total Pago</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>${formatCurrency(charge.amount)}</td>
                  <td>${formatCurrency(paymentRecord.interest)}</td>
                  <td>${formatCurrency(paymentRecord.discount)}</td>
                  <td class="total-td">${formatCurrency(paymentRecord.amountPaid)}</td>
                </tr>
              </tbody>
            </table>

            ${hasObservation ? `<div style="margin-bottom: 4mm; background: #f8fafc; border: 1px solid #e2e8f0; padding: 5px 10px; border-radius: 4px; font-size: 10px;"><span style="font-size: 8px; font-weight: 900; color: #64748b; text-transform: uppercase;">Observação:</span> ${escapeHtml(receiptObservation)}</div>` : ""}

            <p class="declaration">
              Declaramos o recebimento do valor acima descrito, referente à cobrança indicada neste comprovante.
              Este recibo é válido após a confirmação do pagamento.
            </p>

            <div class="signature-area">
              <div class="signature">
                ${escapeHtml(companyName)}
                <small>Recebedor</small>
              </div>
              <div class="signature">
                Assinatura / Conferência
                <small>Pagador</small>
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
