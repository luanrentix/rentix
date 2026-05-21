import { BadRequestException } from '@nestjs/common';
import { FinancialAccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContasPagarService } from './contas-pagar.service';

describe('ContasPagarService', () => {
  function createService({
    account = {
      id: 'payable-1',
      amount: new Prisma.Decimal(1000),
    },
  }: {
    account?: { id: string; amount: Prisma.Decimal };
  } = {}) {
    const tx = {
      pagamentoRealizado: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            amountPaid: new Prisma.Decimal(0),
            discount: new Prisma.Decimal(0),
            interest: new Prisma.Decimal(0),
          },
        }),
        create: jest.fn().mockResolvedValue({ id: 'payment-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      contaPagar: {
        update: jest.fn().mockImplementation(({ data }) =>
          Promise.resolve({
            ...account,
            status: data.status,
            payments: [],
          }),
        ),
      },
    };

    const prisma = {
      contaPagar: {
        findFirst: jest.fn().mockResolvedValue(account),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (transaction: typeof tx) => unknown) =>
          callback(tx),
        ),
    } as unknown as PrismaService;

    return {
      service: new ContasPagarService(prisma),
      tx,
    };
  }

  it('quita a conta quando pagamento com desconto liquida o valor original', async () => {
    const { service, tx } = createService();

    await service.pay(
      'payable-1',
      {
        paidAt: '2026-05-15',
        method: 'PIX',
        amountPaid: 900,
        discount: 100,
      },
      'company-1',
    );

    expect(tx.contaPagar.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: FinancialAccountStatus.PAID },
      }),
    );
  });

  it('mantem pendente quando o pagamento e parcial', async () => {
    const { service, tx } = createService();

    await service.pay(
      'payable-1',
      {
        paidAt: '2026-05-15',
        method: 'PIX',
        amountPaid: 400,
      },
      'company-1',
    );

    expect(tx.contaPagar.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: FinancialAccountStatus.PENDING },
      }),
    );
  });

  it('bloqueia pagamento maior que o saldo liquidado da conta', async () => {
    const { service, tx } = createService();

    await expect(
      service.pay(
        'payable-1',
        {
          paidAt: '2026-05-15',
          method: 'PIX',
          amountPaid: 1200,
        },
        'company-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.pagamentoRealizado.create).not.toHaveBeenCalled();
  });
});
