import { FinancialAccountStatus, Prisma } from '@prisma/client';
import { FinanceiroService } from './financeiro.service';
import { PrismaService } from '../prisma/prisma.service';

describe('FinanceiroService', () => {
  function createService({
    receivables = [],
    payables = [],
  }: {
    receivables?: unknown[];
    payables?: unknown[];
  } = {}) {
    const prisma = {
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: 'company-1' }),
      },
      contaReceber: {
        findMany: jest.fn().mockResolvedValue(receivables),
      },
      contaPagar: {
        findMany: jest.fn().mockResolvedValue(payables),
      },
    } as unknown as PrismaService;

    return {
      service: new FinanceiroService(prisma),
      prisma,
    };
  }

  it('mantem conta parcialmente recebida em aberto e informa saldo restante', async () => {
    const { service } = createService({
      receivables: [
        {
          id: 'receivable-1',
          tenantName: 'Inquilino',
          propertyName: 'Imovel',
          dueDate: new Date('2099-05-10T00:00:00'),
          amount: new Prisma.Decimal(1000),
          status: FinancialAccountStatus.PENDING,
          payments: [
            {
              paidAt: new Date('2099-05-05T00:00:00'),
              amountPaid: new Prisma.Decimal(300),
            },
          ],
        },
      ],
    });

    const resumo = await service.getResumo('company-1');

    expect(resumo.receivables[0]).toMatchObject({
      id: 'receivable-1',
      status: 'Pending',
      paidAmount: 300,
      remainingAmount: 700,
    });
  });

  it('considera conta quitada quando o valor pago cobre o valor total', async () => {
    const { service } = createService({
      payables: [
        {
          id: 'payable-1',
          personName: 'Fornecedor',
          description: 'Despesa',
          category: 'Geral',
          dueDate: new Date('2099-05-10T00:00:00'),
          amount: new Prisma.Decimal(500),
          status: FinancialAccountStatus.PENDING,
          payments: [
            {
              paidAt: new Date('2099-05-06T00:00:00'),
              amountPaid: new Prisma.Decimal(500),
            },
          ],
        },
      ],
    });

    const resumo = await service.getResumo('company-1');

    expect(resumo.payables[0]).toMatchObject({
      id: 'payable-1',
      status: 'Paid',
      paidAmount: 500,
      remainingAmount: 0,
    });
  });

  it('aplica filtro de periodo no vencimento e na data de baixa', async () => {
    const { service, prisma } = createService();

    await service.getResumo('company-1', {
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    });

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(prisma.contaReceber.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId: 'company-1',
          OR: [
            {
              dueDate: {
                gte: new Date('2026-05-01T00:00:00'),
                lte: new Date('2026-05-31T23:59:59.999'),
              },
            },
            {
              payments: {
                some: {
                  paidAt: {
                    gte: new Date('2026-05-01T00:00:00'),
                    lte: new Date('2026-05-31T23:59:59.999'),
                  },
                },
              },
            },
          ],
        },
      }),
    );
  });

  it('soma no realizado apenas pagamentos dentro do periodo filtrado', async () => {
    const { service } = createService({
      receivables: [
        {
          id: 'receivable-1',
          tenantName: 'Inquilino',
          propertyName: 'Imovel',
          dueDate: new Date('2026-05-10T00:00:00'),
          amount: new Prisma.Decimal(1000),
          status: FinancialAccountStatus.PAID,
          payments: [
            {
              paidAt: new Date('2026-05-05T00:00:00'),
              amountPaid: new Prisma.Decimal(400),
            },
            {
              paidAt: new Date('2026-04-25T00:00:00'),
              amountPaid: new Prisma.Decimal(600),
            },
          ],
        },
      ],
    });

    const resumo = await service.getResumo('company-1', {
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    });

    expect(resumo.receivables[0]).toMatchObject({
      status: 'Paid',
      paidAmount: 400,
      discountAmount: 0,
      interestAmount: 0,
      remainingAmount: 0,
      paymentDate: '2026-05-05',
    });
  });

  it('informa juros e descontos das baixas dentro do periodo filtrado', async () => {
    const { service } = createService({
      receivables: [
        {
          id: 'receivable-1',
          tenantName: 'Inquilino',
          propertyName: 'Imovel',
          dueDate: new Date('2026-05-10T00:00:00'),
          amount: new Prisma.Decimal(1000),
          status: FinancialAccountStatus.PAID,
          payments: [
            {
              paidAt: new Date('2026-05-05T00:00:00'),
              amountPaid: new Prisma.Decimal(920),
              discount: new Prisma.Decimal(100),
              interest: new Prisma.Decimal(20),
            },
          ],
        },
      ],
      payables: [
        {
          id: 'payable-1',
          personName: 'Fornecedor',
          description: 'Despesa',
          category: 'Manutencao',
          dueDate: new Date('2026-05-12T00:00:00'),
          amount: new Prisma.Decimal(500),
          status: FinancialAccountStatus.PAID,
          payments: [
            {
              paidAt: new Date('2026-05-08T00:00:00'),
              amountPaid: new Prisma.Decimal(480),
              discount: new Prisma.Decimal(30),
              interest: new Prisma.Decimal(10),
            },
          ],
        },
      ],
    });

    const resumo = await service.getResumo('company-1', {
      startDate: '2026-05-01',
      endDate: '2026-05-31',
    });

    expect(resumo.receivables[0]).toMatchObject({
      paidAmount: 920,
      discountAmount: 100,
      interestAmount: 20,
    });
    expect(resumo.payables[0]).toMatchObject({
      paidAmount: 480,
      discountAmount: 30,
      interestAmount: 10,
    });
  });

  it('usa desconto e juros para calcular quitacao e saldo restante', async () => {
    const { service } = createService({
      receivables: [
        {
          id: 'receivable-1',
          tenantName: 'Inquilino',
          propertyName: 'Imovel',
          dueDate: new Date('2099-05-10T00:00:00'),
          amount: new Prisma.Decimal(1000),
          status: FinancialAccountStatus.PENDING,
          payments: [
            {
              paidAt: new Date('2099-05-05T00:00:00'),
              amountPaid: new Prisma.Decimal(920),
              discount: new Prisma.Decimal(100),
              interest: new Prisma.Decimal(20),
            },
          ],
        },
      ],
    });

    const resumo = await service.getResumo('company-1');

    expect(resumo.receivables[0]).toMatchObject({
      status: 'Paid',
      paidAmount: 920,
      discountAmount: 100,
      interestAmount: 20,
      remainingAmount: 0,
    });
  });
});
