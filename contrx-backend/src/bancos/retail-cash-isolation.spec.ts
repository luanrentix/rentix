import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { BancosService } from './bancos.service';
import { ensureRetailCashAccount } from '../vendas/retail-cash-account';
import { Prisma } from '@prisma/client';

describe('Isolamento do caixa do varejo', () => {
  const companyId = 'company';
  function fixture() {
    const prisma = {
      bankAccount: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest
          .fn()
          .mockImplementation(({ data }) => ({ id: 'cash', ...data })),
      },
      bankTransaction: {
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue(null),
      },
      sharedBankStatement: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
        findUnique: jest.fn().mockResolvedValue({
          companyId,
          bankAccountId: 'cash',
          company: { tradeName: 'Empresa' },
          expiresAt: new Date(Date.now() + 60_000),
        }),
      },
    };
    return {
      prisma,
      service: new BancosService(prisma as unknown as PrismaService),
    };
  }

  it('exclui caixa do varejo das contas e dos extratos, mesmo com ID explícito', async () => {
    const { prisma, service } = fixture();
    await service.findAllAccounts(companyId);
    expect(prisma.bankAccount.findMany.mock.calls[0][0].where).toMatchObject({
      companyId,
      isRetailCash: false,
    });
    await service.findAllTransactions(companyId, 'cash');
    expect(
      prisma.bankTransaction.findMany.mock.calls[0][0].where,
    ).toMatchObject({
      bankAccountId: 'cash',
      bankAccount: { companyId, isRetailCash: false },
    });
    await service.findSharedStatement('shared');
    expect(prisma.bankAccount.findMany.mock.calls[1][0].where).toMatchObject({
      companyId,
      isRetailCash: false,
    });
    expect(
      prisma.bankTransaction.findMany.mock.calls[1][0].where,
    ).toMatchObject({ bankAccount: { companyId, isRetailCash: false } });
  });

  it('protege acesso direto, conciliação e exclusão pelo Banco', async () => {
    const { prisma, service } = fixture();
    await expect(
      service.findOneAccount('cash', companyId),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(prisma.bankAccount.findFirst.mock.calls[0][0].where).toMatchObject({
      id: 'cash',
      companyId,
      isRetailCash: false,
    });
    await expect(
      service.reconcileTransaction('movement', '2026-11-19', companyId),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.deleteTransaction('movement', companyId),
    ).rejects.toBeInstanceOf(NotFoundException);
    for (const [query] of prisma.bankTransaction.findFirst.mock.calls) {
      expect(query.where.bankAccount).toMatchObject({
        companyId,
        isRetailCash: false,
      });
    }
    await expect(
      service.shareStatement({ bankAccountId: 'cash' }, companyId),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('cria CAIXA GERAL isolado e reutiliza a conta existente sem alterar saldo', async () => {
    const { prisma } = fixture();
    const tx = prisma as unknown as Prisma.TransactionClient;
    const created = await ensureRetailCashAccount(tx, companyId);
    expect(created).toMatchObject({
      name: 'CAIXA GERAL',
      type: 'CASH',
      isRetailCash: true,
      companyId,
    });
    const existing = {
      ...created,
      currentBalance: new Prisma.Decimal('308.98'),
    };
    prisma.bankAccount.findFirst.mockResolvedValue(existing);
    expect(await ensureRetailCashAccount(tx, companyId)).toBe(existing);
    expect(prisma.bankAccount.create).toHaveBeenCalledTimes(1);
    expect(prisma.bankAccount.findFirst.mock.calls[1][0].where).toMatchObject({
      companyId,
      isRetailCash: true,
    });
  });
});
