/** Quantidades em milésimos e valores em centavos, com o mesmo HALF_UP do servidor. */
export function quantityAmount(value: string) {
  const text = value.trim().replace(/\s/g, "");
  const normalized = text.includes(",")
    ? text.replace(/\./g, "").replace(",", ".")
    : text;
  return /^\d+(?:\.\d{1,3})?$/.test(normalized) ? Number(normalized) : NaN;
}
export const addQuantity = (a: number, b: number) =>
  (Math.round(a * 1000) + Math.round(b * 1000)) / 1000;

export function saleAdjustmentCents(line: {
  quantity: number;
  unitPrice: number;
  baseUnitPrice?: number;
  originalUnitPrice?: number;
  discount?: number;
  priceType?: string;
}) {
  const base = line.baseUnitPrice ?? line.unitPrice;
  const withoutAddition =
    (Math.round(base * 100) - Math.round((line.discount || 0) * 100)) / 100;
  return {
    discount:
      saleLineCents(base, line.quantity) -
      saleLineCents(withoutAddition, line.quantity),
    addition:
      saleLineCents(line.unitPrice, line.quantity) -
      saleLineCents(withoutAddition, line.quantity),
    promotion:
      line.priceType === "PROMOCIONAL"
        ? saleLineCents(line.originalUnitPrice ?? base, line.quantity) -
          saleLineCents(base, line.quantity)
        : 0,
  };
}
export function saleLineCents(price: number, quantity: number) {
  if (
    !Number.isFinite(price) ||
    !Number.isFinite(quantity) ||
    price < 0 ||
    quantity < 0
  )
    return NaN;
  if (
    !Number.isSafeInteger(Math.round(price * 100)) ||
    !Number.isSafeInteger(Math.round(quantity * 1000))
  )
    return NaN;
  const cents = BigInt(price.toFixed(2).replace(".", ""));
  const mills = BigInt(quantity.toFixed(3).replace(".", ""));
  const result = (cents * mills + BigInt(500)) / BigInt(1000);
  return result <= BigInt(Number.MAX_SAFE_INTEGER) ? Number(result) : NaN;
}
export const saleSubtotal = (
  lines: { unitPrice: number; quantity: number }[],
) =>
  lines.reduce(
    (sum, line) => sum + saleLineCents(line.unitPrice, line.quantity),
    0,
  ) / 100;

/** Rateia centavos pelo maior resto, sem descontar itens promocionais/bloqueados. */
export function allocateSaleAdjustment(amount: number, bases: number[]) {
  const weights = bases.map((base) => BigInt(Math.max(0, Math.round(base))));
  const sum = weights.reduce((a, b) => a + b, BigInt(0));
  if (!sum || !Number.isFinite(amount) || amount <= 0) return bases.map(() => 0);
  const cents = BigInt(Math.round(amount * 100));
  const values = weights.map((weight) => Number(cents * weight / sum));
  let remaining = Number(cents) - values.reduce((a, b) => a + b, 0);
  const order = weights.map((weight, index) => ({ index, rest: cents * weight % sum }))
    .sort((a, b) => a.rest === b.rest ? a.index - b.index : a.rest > b.rest ? -1 : 1);
  for (const { index } of order) {
    if (!remaining) break;
    values[index]++;
    remaining--;
  }
  return values;
}

export function adjustmentForSaleTotal(subtotal: number, target: number, discountEligible: number, canAdd: boolean) {
  if (!Number.isFinite(target) || target < 0) throw new Error("Informe um total válido e não negativo.");
  const difference = Math.round(subtotal * 100) - Math.round(target * 100);
  if (difference > Math.round(discountEligible * 100)) throw new Error("O total informado exige desconto em produtos que não permitem desconto.");
  if (difference < 0 && !canAdd) throw new Error("Os produtos desta venda não permitem acréscimo.");
  return { discount: Math.max(0, difference) / 100, addition: Math.max(0, -difference) / 100 };
}

/** Rateio da devolução sobre os valores históricos, arredondado apenas ao final. */
export function saleReturnCents(
  order: {
    subtotal: string | number;
    discount: string | number;
    addition: string | number;
    items: { subtotal: string | number; quantity: number }[];
  },
  returned: { itemIndex: number; quantity: number }[],
) {
  const cents = (value: string | number) =>
    BigInt(Math.round(Number(value) * 100));
  const subtotal = cents(order.subtotal);
  if (subtotal <= BigInt(0)) return 0;
  const gross = subtotal - cents(order.discount) + cents(order.addition);
  let numerator = BigInt(0),
    denominator = BigInt(1);
  for (const entry of returned) {
    const source = order.items[entry.itemIndex];
    if (!source || source.quantity <= 0) return NaN;
    const nextDenominator =
      subtotal * BigInt(Math.round(source.quantity * 1000));
    const nextNumerator =
      cents(source.subtotal) *
      gross *
      BigInt(Math.round(entry.quantity * 1000));
    numerator = numerator * nextDenominator + nextNumerator * denominator;
    denominator *= nextDenominator;
  }
  return Number(
    (numerator * BigInt(2) + denominator) / (denominator * BigInt(2)),
  );
}
