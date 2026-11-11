import {
  calculatePriceComposition,
  type SalesPriceComposition,
  validateSalesPriceComposition,
} from './price-composition';

const line = () => ({ enabled: false, mode: 'AMOUNT' as const, value: 0 });
const expense = () => ({
  enabled: false,
  percentage: 0,
  basis: 'SALE_PRICE' as const,
});

const baseComposition = (): SalesPriceComposition => ({
  version: 1,
  acquisitionValue: 100,
  freight: line(),
  insurance: line(),
  otherExpenses: line(),
  acquisitionDiscount: line(),
  nonRecoverableIpi: line(),
  nonRecoverableIcmsSt: line(),
  otherNonRecoverableTaxes: line(),
  recoverableTaxCredits: { enabled: false, amount: 0 },
  expenses: {
    icms: expense(),
    pis: expense(),
    cofins: expense(),
    sellerCommission: expense(),
    cardFee: expense(),
    marketplaceFee: expense(),
    administrative: expense(),
    operational: expense(),
    otherVariable: expense(),
  },
  profitMode: 'MARGIN',
  desiredMarginPercent: 25,
  desiredProfitAmount: 0,
  priceTableMargins: [10, 15, 20, 25, 30],
});

describe('price composition calculations', () => {
  it('solves a sale price from adjusted cost, sale expenses, and desired markup', () => {
    const composition = baseComposition();
    composition.expenses.cardFee = {
      enabled: true,
      percentage: 15,
      basis: 'SALE_PRICE',
    };

    const result = calculatePriceComposition(composition);

    expect(result.valid).toBe(true);
    expect(result.salePrice).toBe(147.06);
    expect(result.saleExpenses).toBe(22.06);
    expect(result.estimatedProfit).toBe(25);
    expect(result.effectiveMarginPercent).toBe(17);
  });

  it('adds and subtracts enabled acquisition components from the acquisition base', () => {
    const composition = baseComposition();
    composition.freight = { enabled: true, mode: 'PERCENT', value: 5 };
    composition.insurance = { enabled: true, mode: 'AMOUNT', value: 2 };
    composition.acquisitionDiscount = {
      enabled: true,
      mode: 'AMOUNT',
      value: 10,
    };
    composition.nonRecoverableIpi = {
      enabled: true,
      mode: 'PERCENT',
      value: 5,
    };
    composition.recoverableTaxCredits = { enabled: true, amount: 3 };

    const result = calculatePriceComposition(composition);

    expect(result.adjustedCost).toBe(99);
    expect(result.acquisitionBreakdown).toMatchObject({
      freight: 5,
      insurance: 2,
      acquisitionDiscount: -10,
      nonRecoverableIpi: 5,
      recoverableTaxCredits: -3,
    });
  });

  it('supports costs based on acquisition cost and computes an entered price margin', () => {
    const composition = baseComposition();
    composition.desiredMarginPercent = 20;
    composition.expenses.operational = {
      enabled: true,
      percentage: 10,
      basis: 'ACQUISITION_COST',
    };
    composition.expenses.cardFee = {
      enabled: true,
      percentage: 10,
      basis: 'SALE_PRICE',
    };

    const suggested = calculatePriceComposition(composition);
    const entered = calculatePriceComposition(composition, 150);

    expect(suggested.salePrice).toBe(146.67);
    expect(entered.salePrice).toBe(150);
    expect(entered.saleExpenses).toBe(25);
    expect(entered.estimatedProfit).toBe(25);
    expect(entered.effectiveMarginPercent).toBe(16.67);
  });

  it('solves from a fixed desired profit amount', () => {
    const composition = baseComposition();
    composition.profitMode = 'AMOUNT';
    composition.desiredProfitAmount = 25;
    composition.expenses.cardFee = {
      enabled: true,
      percentage: 10,
      basis: 'SALE_PRICE',
    };

    const result = calculatePriceComposition(composition);

    expect(result.salePrice).toBe(138.89);
    expect(result.estimatedProfit).toBe(25);
  });

  it('supports markup above 100 percent over the acquisition cost', () => {
    const composition = baseComposition();
    composition.desiredMarginPercent = 200;

    const result = calculatePriceComposition(composition);

    expect(result.valid).toBe(true);
    expect(result.salePrice).toBe(300);
    expect(result.estimatedProfit).toBe(200);
    expect(result.effectiveMarginPercent).toBeCloseTo(66.67, 2);
    expect(validateSalesPriceComposition(composition)).toBe(true);
  });

  it('rejects sale expenses at or above 100 percent and negative values', () => {
    const composition = baseComposition();
    composition.desiredMarginPercent = 90;
    composition.expenses.icms = {
      enabled: true,
      percentage: 100,
      basis: 'SALE_PRICE',
    };
    expect(calculatePriceComposition(composition).valid).toBe(false);

    composition.desiredMarginPercent = 20;
    composition.freight = { enabled: true, mode: 'AMOUNT', value: -1 };
    expect(calculatePriceComposition(composition).valid).toBe(false);
    expect(calculatePriceComposition(baseComposition(), Number.NaN).valid).toBe(
      false,
    );
  });

  it('validates persisted composition structure and five price scenarios', () => {
    const composition = baseComposition();
    expect(validateSalesPriceComposition(composition)).toBe(true);
    expect(
      validateSalesPriceComposition({
        ...composition,
        priceTableMargins: [10, 20],
      }),
    ).toBe(false);
  });
});
