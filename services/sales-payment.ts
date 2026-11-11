export type SalePaymentMethod =
  | "DINHEIRO"
  | "PIX"
  | "DEBITO"
  | "CREDITO"
  | "CREDIARIO"
  | "SALDO_CLIENTE"
  | "MISTO";
export type SalePaymentParts = Record<
  Exclude<SalePaymentMethod, "MISTO">,
  string
>;
export const paymentLabels: Record<SalePaymentMethod, string> = {
  DINHEIRO: "Dinheiro",
  PIX: "Pix",
  DEBITO: "Cartão de débito",
  CREDITO: "Cartão de crédito",
  CREDIARIO: "Crediário",
  SALDO_CLIENTE: "Crédito do cliente",
  MISTO: "Pagamento misto",
};
export function paymentAmount(value: string) {
  const text = value.trim().replace(/\s/g, "");
  if (!text) return 0;
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  return /^\d+(?:\.\d{1,2})?$/.test(normalized) ? Number(normalized) : NaN;
}
export const paymentCents = (value: number) => Math.round(value * 100);
export function paymentBreakdown(
  method: SalePaymentMethod,
  parts: SalePaymentParts,
  total: number,
) {
  const amounts = Object.fromEntries(
    Object.entries(parts).map(([key, value]) => [
      key,
      method === "MISTO" ? paymentAmount(value) : method === key ? total : 0,
    ]),
  ) as Record<Exclude<SalePaymentMethod, "MISTO">, number>;
  const allocated = Object.values(amounts).reduce(
    (sum, value) => sum + paymentCents(value),
    0,
  );
  return {
    amounts,
    remaining: (paymentCents(total) - allocated) / 100,
    immediate:
      (paymentCents(amounts.DINHEIRO) +
        paymentCents(amounts.PIX) +
        paymentCents(amounts.DEBITO) +
        paymentCents(amounts.CREDITO)) /
      100,
  };
}
export function installmentPreview(amount: number, count: number) {
  if (
    !Number.isInteger(count) ||
    count < 1 ||
    count > 60 ||
    count > paymentCents(amount)
  )
    return [];
  const cents = paymentCents(amount);
  return Array.from(
    { length: count },
    (_, index) =>
      (Math.floor(cents / count) + (index < cents % count ? 1 : 0)) / 100,
  );
}
export function validateSalePayment(input: {
  method: SalePaymentMethod;
  parts: SalePaymentParts;
  total: number;
  accountId: string;
  accounts: { id: string }[];
  accountManagedByServer?: boolean;
  customer?: {
    referenceOnly?: boolean;
    isSystem: boolean;
    creditBlocked: boolean;
    creditDays: number | null;
    creditLimit: string | number;
  };
  creditBalance: number;
  installments: number;
  tender: string;
}) {
  const { amounts, immediate, remaining } = paymentBreakdown(
    input.method,
    input.parts,
    input.total,
  );
  if (
    !Number.isFinite(input.total) ||
    input.total < 0 ||
    Object.values(amounts).some((value) => !Number.isFinite(value) || value < 0)
  )
    return "Informe valores válidos, com até duas casas decimais.";
  if (input.method === "MISTO" && paymentCents(remaining) !== 0)
    return remaining > 0
      ? "Falta distribuir parte do total entre as formas de pagamento."
      : "As formas de pagamento ultrapassam o total da venda.";
  if (
    immediate > 0 &&
    !input.accountManagedByServer &&
    !input.accounts.some((account) => account.id === input.accountId)
  )
    return "Selecione uma conta ou caixa de recebimento válido.";
  if (amounts.CREDIARIO > 0) {
    if (input.customer?.referenceOnly)
      return "Vendas a prazo exigem cadastro completo. Cliente apenas referência não pode comprar a prazo.";
    if (
      !input.customer ||
      input.customer.isSystem ||
      input.customer.creditBlocked
    )
      return "Selecione um cliente identificado e liberado para crediário.";
    if (!input.customer.creditDays || input.customer.creditDays < 1)
      return "Cadastre o prazo de crediário do cliente.";
    if (amounts.CREDIARIO > Number(input.customer.creditLimit))
      return "O valor a prazo excede o limite cadastrado do cliente.";
    if (!installmentPreview(amounts.CREDIARIO, input.installments).length)
      return "Informe de 1 a 60 parcelas, com valor mínimo de R$ 0,01 por parcela.";
  }
  if (
    amounts.SALDO_CLIENTE > 0 &&
    (!input.customer ||
      input.customer.isSystem ||
      paymentCents(amounts.SALDO_CLIENTE) > paymentCents(input.creditBalance))
  )
    return "O valor de crédito utilizado excede o saldo disponível do cliente.";
  if (amounts.DINHEIRO > 0 && input.tender.trim()) {
    const tender = paymentAmount(input.tender);
    if (
      !Number.isFinite(tender) ||
      paymentCents(tender) < paymentCents(amounts.DINHEIRO)
    )
      return "O dinheiro entregue deve cobrir o valor pago em dinheiro.";
  }
  return null;
}
