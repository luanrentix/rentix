import { BadRequestException } from '@nestjs/common';
import { FinancialAccountStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ContasReceberService } from './contas-receber.service';

describe('ContasReceberService', () => {
  function createService({
    account = {
      id: 'receivable-1',
      amount: new Prisma.Decimal(1000),
    },
    currentPaidAmount = 0,
  }: {
    account?: { id: string; amount: Prisma.Decimal };
    currentPaidAmount?: number;
  } = {}) {
    const tx = {
      pagamentoRecebido: {
        aggregate: jest.fn().mockResolvedValue({
          _sum: {
            amountPaid: new Prisma.Decimal(currentPaidAmount),
            discount: new Prisma.Decimal(0),
            interest: new Prisma.Decimal(0),
          },
        }),
        create: jest.fn().mockResolvedValue({ id: 'payment-1' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      contaReceber: {
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
      contaReceber: {
        findFirst: jest.fn().mockResolvedValue(account),
      },
      $transaction: jest
        .fn()
        .mockImplementation((callback: (transaction: typeof tx) => unknown) =>
          callback(tx),
        ),
    } as unknown as PrismaService;

    return {
      service: new ContasReceberService(prisma),
      prisma,
      tx,
    };
  }

  it('mantem a conta pendente quando o recebimento e parcial', async () => {
    const { service, tx } = createService();

    await service.receivePayment(
      'receivable-1',
      {
        paidAt: '2026-05-10',
        method: 'PIX',
        amountPaid: 400,
      },
      'company-1',
    );

    expect(tx.pagamentoRecebido.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: new Prisma.Decimal(400),
        }),
      }),
    );
    expect(tx.pagamentoRecebido.deleteMany).not.toHaveBeenCalled();
    expect(tx.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: FinancialAccountStatus.PENDING },
      }),
    );
  });

  it('acumula recebimentos e quita quando o total cobre a conta', async () => {
    const { service, tx } = createService({ currentPaidAmount: 700 });

    await service.receivePayment(
      'receivable-1',
      {
        paidAt: '2026-05-15',
        method: 'CASH',
        amountPaid: 300,
      },
      'company-1',
    );

    expect(tx.pagamentoRecebido.create).toHaveBeenCalled();
    expect(tx.pagamentoRecebido.deleteMany).not.toHaveBeenCalled();
    expect(tx.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: FinancialAccountStatus.PAID },
      }),
    );
  });

  it('quita a conta quando pagamento com desconto liquida o valor original', async () => {
    const { service, tx } = createService();

    await service.receivePayment(
      'receivable-1',
      {
        paidAt: '2026-05-15',
        method: 'PIX',
        amountPaid: 900,
        discount: 100,
      },
      'company-1',
    );

    expect(tx.pagamentoRecebido.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: new Prisma.Decimal(900),
          discount: new Prisma.Decimal(100),
        }),
      }),
    );
    expect(tx.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: FinancialAccountStatus.PAID },
      }),
    );
  });

  it('permite receber juros sem exceder o saldo liquidado', async () => {
    const { service, tx } = createService();

    await service.receivePayment(
      'receivable-1',
      {
        paidAt: '2026-05-15',
        method: 'PIX',
        amountPaid: 1100,
        interest: 100,
      },
      'company-1',
    );

    expect(tx.pagamentoRecebido.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          amountPaid: new Prisma.Decimal(1100),
          interest: new Prisma.Decimal(100),
        }),
      }),
    );
    expect(tx.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: FinancialAccountStatus.PAID },
      }),
    );
  });

  it('substitui recebimento em uma unica transacao', async () => {
    const { service, tx } = createService();

    await service.replacePayment(
      'receivable-1',
      {
        paidAt: '2026-05-15',
        method: 'PIX',
        amountPaid: 1000,
      },
      'company-1',
    );

    expect(tx.pagamentoRecebido.deleteMany).toHaveBeenCalledWith({
      where: { chargeId: 'receivable-1' },
    });
    expect(tx.pagamentoRecebido.create).toHaveBeenCalled();
    expect(tx.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: FinancialAccountStatus.PAID },
      }),
    );
  });

  it('bloqueia recebimento adicional em conta ja quitada', async () => {
    const { service, tx } = createService({ currentPaidAmount: 1000 });

    await expect(
      service.receivePayment(
        'receivable-1',
        {
          paidAt: '2026-05-15',
          method: 'PIX',
          amountPaid: 10,
        },
        'company-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(tx.pagamentoRecebido.create).not.toHaveBeenCalled();
  });

  it('estorna todos os recebimentos e volta a conta para pendente', async () => {
    const { service, tx } = createService({ currentPaidAmount: 1000 });

    await service.reversePayment('receivable-1', 'company-1');

    expect(tx.pagamentoRecebido.deleteMany).toHaveBeenCalledWith({
      where: { chargeId: 'receivable-1' },
    });
    expect(tx.contaReceber.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { status: FinancialAccountStatus.PENDING },
      }),
    );
  });
});
