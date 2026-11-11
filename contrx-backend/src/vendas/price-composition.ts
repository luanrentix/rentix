export type PriceComponentMode = 'AMOUNT' | 'PERCENT';
export type PriceExpenseBasis = 'SALE_PRICE' | 'ACQUISITION_COST';

export type AcquisitionComponent = {
  enabled: boolean;
  mode: PriceComponentMode;
  value: number;
};

export type SaleExpense = {
  enabled: boolean;
  percentage: number;
  basis: PriceExpenseBasis;
};

export type SalesPriceComposition = {
  version: 1;
  acquisitionValue: number;
  freight: AcquisitionComponent;
  insurance: AcquisitionComponent;
  otherExpenses: AcquisitionComponent;
  acquisitionDiscount: AcquisitionComponent;
  nonRecoverableIpi: AcquisitionComponent;
  nonRecoverableIcmsSt: AcquisitionComponent;
  otherNonRecoverableTaxes: AcquisitionComponent;
  recoverableTaxCredits: { enabled: boolean; amount: number };
  expenses: {
    icms: SaleExpense;
    pis: SaleExpense;
    cofins: SaleExpense;
    sellerCommission: SaleExpense;
    cardFee: SaleExpense;
    marketplaceFee: SaleExpense;
    administrative: SaleExpense;
    operational: SaleExpense;
    otherVariable: SaleExpense;
  };
  profitMode: 'MARGIN' | 'AMOUNT';
  desiredMarginPercent: number;
  desiredProfitAmount: number;
  priceTableMargins: number[];
};

export type SalesPriceCompositionTemplate = {
  version: 1;
  desiredMarginPercent: number;
};

export function toSalesPriceCompositionTemplate(
  composition: SalesPriceComposition,
): SalesPriceCompositionTemplate {
  return {
    version: 1,
    desiredMarginPercent: composition.desiredMarginPercent,
  };
}

export function applySalesPriceCompositionTemplate(
  composition: SalesPriceComposition,
  template: SalesPriceCompositionTemplate,
): SalesPriceComposition {
  return {
    ...composition,
    version: 1,
    profitMode: 'MARGIN',
    desiredMarginPercent: template.desiredMarginPercent,
  };
}

export type PriceCompositionResult = {
  valid: boolean;
  error: string | null;
  adjustedCost: number;
  salePrice: number;
  saleExpenses: number;
  estimatedProfit: number;
  effectiveMarginPercent: number;
  markupMultiplier: number;
  acquisitionBreakdown: Record<string, number>;
  expenseBreakdown: Record<string, number>;
};

const toCents = (value: number) => Math.round((value + Number.EPSILON) * 100);
const fromCents = (value: number) => Number((value / 100).toFixed(2));
const toBasisPoints = (value: number) =>
  Math.round((value + Number.EPSILON) * 100);

function percentOfCents(cents: number, basisPoints: number) {
  return Math.floor((cents * basisPoints + 5000) / 10000);
}

function calculateAcquisition(composition: SalesPriceComposition) {
  const base = Math.max(0, toCents(composition.acquisitionValue));
  const breakdown: Record<string, number> = { acquisitionValue: base };
  let total = base;
  const add = (
    key: keyof Pick<
      SalesPriceComposition,
      | 'freight'
      | 'insurance'
      | 'otherExpenses'
      | 'acquisitionDiscount'
      | 'nonRecoverableIpi'
      | 'nonRecoverableIcmsSt'
      | 'otherNonRecoverableTaxes'
    >,
    sign: 1 | -1,
  ) => {
    const component = composition[key];
    const amount =
      component.mode === 'PERCENT'
        ? percentOfCents(base, toBasisPoints(component.value))
        : toCents(component.value);
    breakdown[key] = sign * amount;
    total += sign * amount;
  };
  add('freight', 1);
  add('insurance', 1);
  add('otherExpenses', 1);
  add('nonRecoverableIpi', 1);
  add('nonRecoverableIcmsSt', 1);
  add('otherNonRecoverableTaxes', 1);
  add('acquisitionDiscount', -1);
  const credits = toCents(composition.recoverableTaxCredits.amount);
  breakdown.recoverableTaxCredits = -credits;
  total -= credits;
  return { total, breakdown };
}

function calculateExpenseRates(composition: SalesPriceComposition) {
  let salePriceRate = 0;
  let acquisitionRate = 0;
  for (const expense of Object.values(composition.expenses)) {
    const rate = toBasisPoints(expense.percentage);
    if (expense.basis === 'SALE_PRICE') salePriceRate += rate;
    else acquisitionRate += rate;
  }
  return { salePriceRate, acquisitionRate };
}

function computePriceCents(
  adjustedCostCents: number,
  acquisitionExpensesCents: number,
  saleExpenseRate: number,
  profitMode: SalesPriceComposition['profitMode'],
  marginPercent: number,
  profitAmount: number,
) {
  const costBasisCents = BigInt(adjustedCostCents + acquisitionExpensesCents);
  const saleRate = BigInt(saleExpenseRate);
  const denominator = BigInt(10_000) - saleRate;
  if (denominator <= BigInt(0)) return null;
  const profitCents =
    profitMode === 'MARGIN'
      ? (costBasisCents * BigInt(toBasisPoints(marginPercent)) +
          BigInt(5_000)) /
        BigInt(10_000)
      : profitMode === 'AMOUNT'
        ? BigInt(toCents(profitAmount))
        : BigInt(0);
  const numerator = costBasisCents + profitCents;
  const priceCents =
    (numerator * BigInt(10_000) + denominator / BigInt(2)) / denominator;
  if (priceCents > BigInt(10_000_000_000)) return null;
  return Number(priceCents);
}

export function calculatePriceComposition(
  composition: SalesPriceComposition,
  manualPrice?: number | null,
  overrideMarginPercent?: number,
): PriceCompositionResult {
  const values = [
    composition.acquisitionValue,
    composition.desiredMarginPercent,
    composition.desiredProfitAmount,
    composition.recoverableTaxCredits.amount,
    ...Object.values(composition.expenses).flatMap((item) => [item.percentage]),
    ...Object.values(composition)
      .filter(
        (item): item is AcquisitionComponent =>
          Boolean(item) && typeof item === 'object' && 'mode' in item,
      )
      .map((item) => item.value),
    ...composition.priceTableMargins,
  ];
  if (values.some((value) => !Number.isFinite(value) || value < 0))
    return invalidResult(
      'Valores e percentuais devem ser números não negativos.',
    );
  if (
    values.some(
      (value) => value > 100_000_000 || !Number.isSafeInteger(toCents(value)),
    )
  )
    return invalidResult(
      'Valores excedem o limite seguro para cálculo monetário.',
    );
  const percentageComponents = Object.values(composition)
    .filter(
      (item): item is AcquisitionComponent =>
        Boolean(item) && typeof item === 'object' && 'mode' in item,
    )
    .filter((item) => item.mode === 'PERCENT');
  if (percentageComponents.some((item) => item.value > 100))
    return invalidResult('Percentuais de custo não podem superar 100%.');
  if (
    Object.values(composition.expenses).some(
      (expense) => expense.percentage > 100,
    ) ||
    composition.priceTableMargins.some((margin) => margin > 100)
  )
    return invalidResult('Percentuais não podem superar 100%.');

  const acquisition = calculateAcquisition(composition);
  if (acquisition.total < 0)
    return invalidResult(
      'Os abatimentos não podem superar o custo de aquisição.',
    );
  const { salePriceRate, acquisitionRate } = calculateExpenseRates(composition);
  if (salePriceRate >= 10000)
    return invalidResult(
      'As despesas incidentes sobre a venda devem ser inferiores a 100%.',
    );
  if (
    manualPrice != null &&
    (!Number.isFinite(manualPrice) ||
      manualPrice < 0 ||
      manualPrice > 100_000_000 ||
      !Number.isSafeInteger(toCents(manualPrice)))
  )
    return invalidResult(
      'O preço simulado deve ser um valor monetário válido.',
    );

  const acquisitionExpenses = percentOfCents(
    acquisition.total,
    acquisitionRate,
  );
  const targetMargin =
    overrideMarginPercent ?? composition.desiredMarginPercent;
  const manualCents = manualPrice == null ? null : toCents(manualPrice);
  const suggestedCents = computePriceCents(
    acquisition.total,
    acquisitionExpenses,
    salePriceRate,
    overrideMarginPercent === undefined ? composition.profitMode : 'MARGIN',
    targetMargin,
    composition.desiredProfitAmount,
  );
  if (suggestedCents === null)
    return invalidResult(
      'O preÃ§o calculado excede o limite de R$ 100.000.000,00.',
    );
  const salePriceCents = manualCents ?? suggestedCents;
  const expenseBreakdown: Record<string, number> = {};
  let totalExpensesCents = 0;
  for (const [key, expense] of Object.entries(composition.expenses)) {
    const base =
      expense.basis === 'SALE_PRICE' ? salePriceCents : acquisition.total;
    const amount = percentOfCents(base, toBasisPoints(expense.percentage));
    expenseBreakdown[key] = amount;
    totalExpensesCents += amount;
  }
  const estimatedProfitCents =
    salePriceCents - acquisition.total - totalExpensesCents;
  const effectiveMarginPercent =
    salePriceCents > 0
      ? Number(((estimatedProfitCents / salePriceCents) * 100).toFixed(2))
      : 0;
  return {
    valid: true,
    error: null,
    adjustedCost: fromCents(acquisition.total),
    salePrice: fromCents(salePriceCents),
    saleExpenses: fromCents(totalExpensesCents),
    estimatedProfit: fromCents(estimatedProfitCents),
    effectiveMarginPercent,
    markupMultiplier:
      acquisition.total > 0
        ? Number((salePriceCents / acquisition.total).toFixed(4))
        : 0,
    acquisitionBreakdown: Object.fromEntries(
      Object.entries(acquisition.breakdown).map(([key, amount]) => [
        key,
        fromCents(amount),
      ]),
    ),
    expenseBreakdown: Object.fromEntries(
      Object.entries(expenseBreakdown).map(([key, amount]) => [
        key,
        fromCents(amount),
      ]),
    ),
  };
}

function invalidResult(error: string): PriceCompositionResult {
  return {
    valid: false,
    error,
    adjustedCost: 0,
    salePrice: 0,
    saleExpenses: 0,
    estimatedProfit: 0,
    effectiveMarginPercent: 0,
    markupMultiplier: 0,
    acquisitionBreakdown: {},
    expenseBreakdown: {},
  };
}

export function validateSalesPriceComposition(
  value: unknown,
): value is SalesPriceComposition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const composition = value as Partial<SalesPriceComposition>;
  const finiteNonNegative = (entry: unknown) =>
    typeof entry === 'number' && Number.isFinite(entry) && entry >= 0;
  const acquisitionKeys = [
    'freight',
    'insurance',
    'otherExpenses',
    'acquisitionDiscount',
    'nonRecoverableIpi',
    'nonRecoverableIcmsSt',
    'otherNonRecoverableTaxes',
  ] as const;
  const expenseKeys = [
    'icms',
    'pis',
    'cofins',
    'sellerCommission',
    'cardFee',
    'marketplaceFee',
    'administrative',
    'operational',
    'otherVariable',
  ] as const;
  if (
    composition.version !== 1 ||
    !finiteNonNegative(composition.acquisitionValue) ||
    !finiteNonNegative(composition.desiredMarginPercent) ||
    !finiteNonNegative(composition.desiredProfitAmount) ||
    !['MARGIN', 'AMOUNT'].includes(String(composition.profitMode)) ||
    !Array.isArray(composition.priceTableMargins) ||
    composition.priceTableMargins.length !== 5 ||
    !composition.priceTableMargins.every(
      (margin) => finiteNonNegative(margin) && margin <= 100,
    )
  )
    return false;
  for (const key of acquisitionKeys) {
    const component = composition[key];
    if (
      !component ||
      typeof component.enabled !== 'boolean' ||
      !['AMOUNT', 'PERCENT'].includes(component.mode) ||
      !finiteNonNegative(component.value) ||
      (component.mode === 'PERCENT' && component.value > 100)
    )
      return false;
  }
  const credits = composition.recoverableTaxCredits;
  if (
    !credits ||
    typeof credits.enabled !== 'boolean' ||
    !finiteNonNegative(credits.amount)
  )
    return false;
  const expenses = composition.expenses;
  if (!expenses || typeof expenses !== 'object') return false;
  for (const key of expenseKeys) {
    const expense = expenses[key];
    if (
      !expense ||
      typeof expense.enabled !== 'boolean' ||
      !finiteNonNegative(expense.percentage) ||
      expense.percentage > 100 ||
      !['SALE_PRICE', 'ACQUISITION_COST'].includes(expense.basis)
    )
      return false;
  }
  return calculatePriceComposition(composition as SalesPriceComposition).valid;
}
