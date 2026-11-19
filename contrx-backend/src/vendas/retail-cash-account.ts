import { Prisma } from '@prisma/client';

// O chamador deve manter o bloqueio da empresa durante a transação.
export async function ensureRetailCashAccount(
  tx: Prisma.TransactionClient,
  companyId: string,
) {
  const account = await tx.bankAccount.findFirst({
    where: {
      companyId,
      isRetailCash: true,
      name: 'CAIXA GERAL',
      type: 'CASH',
      active: true,
      deletedAt: null,
    },
    orderBy: { createdAt: 'asc' },
  });
  return (
    account ??
    tx.bankAccount.create({
      data: {
        companyId,
        name: 'CAIXA GERAL',
        type: 'CASH',
        isRetailCash: true,
      },
    })
  );
}
