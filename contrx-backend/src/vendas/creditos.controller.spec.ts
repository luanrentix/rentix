import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { SalesCreditsService } from './creditos.controller';
import { customerCreditBalance } from './credit-ledger';

const decimal = (amount: number) => new Prisma.Decimal(amount);
function fixture() {
  const user = {
    id: 'actor',
    companyId: 'company',
    role: 'ADMIN',
    name: 'Administrador',
    email: 'test@example.invalid',
  };
  const adjustments: any[] = [];
  const settlements: any[] = [];
  const refund = {
    id: 'refund',
    companyId: 'company',
    orderId: 'order',
    transactionId: 'transaction',
    amount: decimal(100),
    settledAmount: decimal(0),
  };
  let bankBalance = decimal(100);
  const tx = {
    contaPagar: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn(),
    },
    pagamentoRealizado: { create: jest.fn() },
    $queryRaw: jest.fn().mockResolvedValue([]),
    salesCustomerCredit: {
      aggregate: jest.fn().mockResolvedValue({ _sum: { amount: decimal(50) } }),
    },
    salesCreditAdjustment: {
      aggregate: jest.fn().mockImplementation(async () => ({
        _sum: {
          amount: adjustments.reduce(
            (sum, entry) => sum.add(entry.amount),
            decimal(0),
          ),
        },
      })),
      findUnique: jest
        .fn()
        .mockImplementation(
          async ({ where }) =>
            adjustments.find(
              (entry) =>
                entry.companyId === where.companyId_requestId.companyId &&
                entry.requestId === where.companyId_requestId.requestId,
            ) || null,
        ),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const entry = {
          ...data,
          amount: new Prisma.Decimal(data.amount),
          id: `adjustment-${adjustments.length}`,
        };
        adjustments.push(entry);
        return entry;
      }),
    },
    salesCustomer: {
      findFirst: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          where.companyId === 'company' && where.id === 'customer'
            ? { id: 'customer', companyId: 'company' }
            : null,
        ),
    },
    salesRefund: {
      findFirst: jest
        .fn()
        .mockImplementation(async ({ where }) =>
          where.id === refund.id && where.companyId === refund.companyId
            ? refund
            : null,
        ),
      update: jest.fn().mockImplementation(async ({ data }) => {
        refund.settledAmount = refund.settledAmount.add(
          data.settledAmount.increment,
        );
        return refund;
      }),
    },
    salesRefundSettlement: {
      findUnique: jest
        .fn()
        .mockImplementation(
          async ({ where }) =>
            settlements.find(
              (entry) =>
                entry.companyId === where.companyId_requestId.companyId &&
                entry.requestId === where.companyId_requestId.requestId,
            ) || null,
        ),
      create: jest.fn().mockImplementation(async ({ data }) => {
        const entry = { ...data, amount: new Prisma.Decimal(data.amount) };
        settlements.push(entry);
        return entry;
      }),
    },
    bankTransaction: {
      findFirst: jest.fn().mockResolvedValue({
        id: 'transaction',
        bankAccountId: 'bank',
        type: 'INFLOW',
      }),
      create: jest.fn().mockResolvedValue({}),
    },
    bankAccount: {
      update: jest.fn().mockImplementation(async ({ data }) => {
        bankBalance = data.currentBalance.decrement
          ? bankBalance.sub(data.currentBalance.decrement)
          : bankBalance.add(data.currentBalance.increment);
      }),
    },
    salesOrder: {
      findFirst: jest
        .fn()
        .mockResolvedValue({ id: 'order', customerId: 'customer' }),
    },
  };
  const prisma = {
    ...tx,
    appSettings: {
      findUnique: jest.fn().mockResolvedValue({
        companySettings: { ramoAtividade: 'CONFECCOES' },
      }),
    },
    $transaction: jest
      .fn()
      .mockImplementation(async (callback) => callback(tx)),
  };
  const service = new SalesCreditsService(prisma as unknown as PrismaService);
  const credit = {
    requestId: 'request',
    customerId: 'customer',
    direction: 'ADD' as const,
    amount: 30,
    reason: 'Ajuste autorizado',
  };
  const settlement = {
    requestId: 'request',
    disposition: 'REFUND' as const,
    amount: 30,
    reason: 'Pix devolvido e conferido',
  };
  return {
    service,
    tx,
    prisma,
    user,
    credit,
    settlement,
    adjustments,
    settlements,
    refund,
    balance: () => bankBalance,
  };
}
describe('Confecções: créditos complementares e confirmação de reembolsos', () => {
  it('soma créditos antigos e ajustes sem criar entrada bancária', async () => {
    const f = fixture();
    await f.service.adjust(f.user, f.credit);
    expect(
      (
        await customerCreditBalance(
          f.tx as unknown as Prisma.TransactionClient,
          'company',
          'customer',
        )
      ).toNumber(),
    ).toBe(80);
    expect(f.tx.bankTransaction.create).not.toHaveBeenCalled();
    expect(f.tx.$queryRaw).toHaveBeenCalled();
  });
  it('repete a concessão idempotentemente e rejeita mudança de valor na mesma chave', async () => {
    const f = fixture();
    await f.service.adjust(f.user, f.credit);
    await f.service.adjust(f.user, f.credit);
    expect(f.adjustments).toHaveLength(1);
    await expect(
      f.service.adjust(f.user, { ...f.credit, amount: 40 }),
    ).rejects.toThrow('Chave');
  });
  it('impede ajuste que torne o saldo negativo', async () => {
    const f = fixture();
    await expect(
      f.service.adjust(f.user, {
        ...f.credit,
        direction: 'DEDUCT',
        amount: 51,
      }),
    ).rejects.toThrow('saldo negativo');
    expect(f.adjustments).toHaveLength(0);
  });
  it('baixa obrigação antiga com ajuste não monetário sem gerar saída bancária', async () => {
    const f = fixture();
    f.tx.contaPagar.findMany.mockResolvedValue([
      { id: 'payable', amount: decimal(50), payments: [] },
    ] as never);
    await f.service.adjust(f.user, {
      ...f.credit,
      direction: 'DEDUCT',
      amount: 20,
    });
    expect(f.tx.pagamentoRealizado.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        expenseId: 'payable',
        method: 'OTHER',
        amountPaid: decimal(20),
      }),
    });
    expect(f.tx.bankTransaction.create).not.toHaveBeenCalled();
  });
  it('isola o cliente pela empresa autenticada', async () => {
    const f = fixture();
    await expect(
      f.service.adjust(f.user, {
        ...f.credit,
        customerId: 'other-company-customer',
      }),
    ).rejects.toThrow('Cliente');
    expect(f.tx.salesCustomer.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'other-company-customer',
        companyId: 'company',
        active: true,
        isSystem: false,
      },
    });
  });
  it('recusa operações sensíveis para usuário sem autorização administrativa', async () => {
    const f = fixture();
    await expect(
      f.service.adjust({ ...f.user, role: 'USER' }, f.credit),
    ).rejects.toThrow('Somente');
    await expect(
      f.service.settle({ ...f.user, role: 'USER' }, 'refund', f.settlement),
    ).rejects.toThrow('Somente');
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('recusa empresa de outro segmento sem iniciar transação', async () => {
    const f = fixture();
    f.prisma.appSettings.findUnique.mockResolvedValue({
      companySettings: { ramoAtividade: 'OUTRO' },
    });
    await expect(f.service.adjust(f.user, f.credit)).rejects.toThrow(
      'exclusivo',
    );
    expect(f.prisma.$transaction).not.toHaveBeenCalled();
  });
  it('confirma devolução parcial e impede saída duplicada na repetição', async () => {
    const f = fixture();
    await f.service.settle(f.user, 'refund', f.settlement);
    await f.service.settle(f.user, 'refund', f.settlement);
    expect(f.balance().toNumber()).toBe(70);
    expect(f.refund.settledAmount.toNumber()).toBe(30);
    expect(f.tx.bankTransaction.create).toHaveBeenCalledTimes(1);
    expect(f.settlements).toHaveLength(1);
    await expect(
      f.service.settle(f.user, 'refund', { ...f.settlement, amount: 31 }),
    ).rejects.toThrow('Chave');
  });
  it('converte valor em crédito sem alterar saldo financeiro', async () => {
    const f = fixture();
    await f.service.settle(f.user, 'refund', {
      ...f.settlement,
      disposition: 'CREDIT',
    });
    expect(f.balance().toNumber()).toBe(100);
    expect(f.adjustments[0].orderId).toBe('order');
    expect(f.adjustments[0].actorId).toBe('actor');
    expect(f.tx.bankTransaction.create).not.toHaveBeenCalled();
  });
  it('impede liquidar valor superior ao pendente ou reembolso de outra empresa', async () => {
    const f = fixture();
    await expect(
      f.service.settle(f.user, 'refund', { ...f.settlement, amount: 101 }),
    ).rejects.toThrow('pendente');
    await expect(
      f.service.settle(
        { ...f.user, companyId: 'other-company' },
        'refund',
        f.settlement,
      ),
    ).rejects.toThrow('pendente');
    expect(f.tx.bankTransaction.create).not.toHaveBeenCalled();
  });
});
