import { Prisma } from '@prisma/client';

export async function customerCreditBalance(
  tx: Prisma.TransactionClient,
  companyId: string,
  customerId: string,
) {
  const [credits, adjustments] = await Promise.all([
    tx.salesCustomerCredit.aggregate({
      where: { companyId, customerId, reversedAt: null },
      _sum: { amount: true },
    }),
    tx.salesCreditAdjustment.aggregate({
      where: { companyId, customerId },
      _sum: { amount: true },
    }),
  ]);
  return (credits._sum.amount ?? new Prisma.Decimal(0)).add(
    adjustments._sum.amount ?? 0,
  );
}
