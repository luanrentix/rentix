import { FinancialAccountStatus } from '@prisma/client';

export const FINANCIAL_SETTLEMENT_TOLERANCE = 0.01;

export function getFinancialSettlementAmount(
  amountPaid: unknown,
  discount: unknown = 0,
  interest: unknown = 0,
) {
  return (
    toFiniteAmount(amountPaid) +
    toFiniteAmount(discount) -
    toFiniteAmount(interest)
  );
}

export function getFinancialStatusAfterSettlement(
  accountAmount: number,
  settlementAmount: number,
) {
  return settlementAmount + FINANCIAL_SETTLEMENT_TOLERANCE >= accountAmount
    ? FinancialAccountStatus.PAID
    : FinancialAccountStatus.PENDING;
}

export function exceedsFinancialSettlementLimit(
  accountAmount: number,
  settlementAmount: number,
) {
  return settlementAmount - accountAmount > FINANCIAL_SETTLEMENT_TOLERANCE;
}

function toFiniteAmount(value: unknown) {
  const amount = Number(value || 0);

  return Number.isFinite(amount) ? amount : 0;
}
