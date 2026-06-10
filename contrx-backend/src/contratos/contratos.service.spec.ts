import { BadRequestException } from '@nestjs/common';
import { ContractStatus, FinancialAccountStatus, Prisma } from '@prisma/client';
import { ContratosService } from './contratos.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ContratosService', () => {
  beforeAll(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-10T12:00:00.000Z'));
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  const contract = {
    id: 'contract-1',
    companyId: 'company-1',
    propertyId: 'property-1',
    tenantId: 'tenant-1',
    propertyName: 'Imovel',
    tenantName: 'Pessoa',
    startDate: new Date('2026-05-01T00:00:00'),
    endDate: new Date('2026-05-31T00:00:00'),
    rentValue: new Prisma.Decimal(1000),
    status: ContractStatus.ACTIVE,
    deletedAt: null,
    statusReason: null,
    statusReasonType: null,
    statusReasonAt: null,
    isTemporaryRental: false,
    checkInTime: null,
    checkOutTime: null,
    renewedAt: null,
    renewalHistory: [],
    finishedAt: null,
    finishReason: null,
    createdAt: new Date('2026-05-01T00:00:00'),
    updatedAt: new Date('2026-05-01T00:00:00'),
  };

  function createService(prismaOverrides: Partial<PrismaService> = {}) {
    const tx = {
      contaReceber: {
        findMany: jest.fn().mockResolvedValue([{ id: 'receivable-1' }]),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn(),
        create: jest.fn(),
      },
      pagamentoRecebido: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      scheduleItem: {
        findFirst: jest.fn().mockResolvedValue(null),
        update: jest.fn(),
        create: jest.fn(),
      },
      contract: {
        create: jest.fn().mockResolvedValue(contract),
        update: jest.fn().mockResolvedValue({
          ...contract,
          status: ContractStatus.CANCELED,
          statusReason: 'Motivo valido',
        }),
      },
    };
    const transactionMock = jest.fn(
      (callback: (client: typeof tx) => unknown) => callback(tx),
    );
    const prisma = {
      contract: {
        findFirst: jest.fn().mockResolvedValue(contract),
      },
      contaReceber: {
        count: jest.fn().mockResolvedValue(0),
      },
      $transaction: transactionMock,
      ...prismaOverrides,
    } as unknown as PrismaService;

    return {
      service: new ContratosService(prisma),
      prisma,
      tx,
      transactionMock,
    };
  }

  it('cancela contrato e remove parcelas pendentes na mesma transacao', async () => {
    const { service, tx } = createService();

    await service.cancel(
      'contract-1',
      { reason: 'Motivo valido' },
      'company-1',
    );

    expect(tx.contaReceber.findMany).toHaveBeenCalledWith({
      where: {
        contractId: 'contract-1',
        companyId: 'company-1',
        status: FinancialAccountStatus.PENDING,
      },
      select: { id: true },
    });
    expect(tx.contaReceber.deleteMany).toHaveBeenCalledWith({
      where: { id: { in: ['receivable-1'] } },
    });
    expect(tx.contract.update).toHaveBeenCalledWith({
      where: { id: 'contract-1' },
      data: {
        status: ContractStatus.CANCELED,
        deletedAt: null,
        statusReason: 'MOTIVO VALIDO',
        statusReasonType: 'CANCELED',
        statusReasonAt: expect.any(Date) as Date,
      },
      include: {
        property: true,
        tenant: true,
        company: true,
      },
    });
  });

  it('cria contrato ativo sem gerar parcelas ou agenda automaticamente', async () => {
    const { service, tx } = createService({
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: 'company-1' }),
      },
      property: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'property-1',
          companyId: 'company-1',
          isActive: true,
        }),
      },
      person: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tenant-1',
          companyId: 'company-1',
          status: 'ACTIVE',
          isTenant: false,
        }),
      },
      contract: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as Partial<PrismaService>);
    tx.contract.create.mockResolvedValue({
      ...contract,
      endDate: new Date('2026-08-01T00:00:00'),
    });
    tx.contaReceber.findMany.mockResolvedValue([]);

    await service.create(
      {
        companyId: 'company-1',
        propertyId: 'property-1',
        tenantId: 'tenant-1',
        propertyName: 'Imovel',
        tenantName: 'Pessoa',
        startDate: '2026-05-01',
        endDate: '2026-08-01',
        rentValue: 1000,
        status: ContractStatus.ACTIVE,
      },
      'company-1',
    );

    expect(tx.contract.create).toHaveBeenCalled();
    expect(tx.contaReceber.create).not.toHaveBeenCalled();
    expect(tx.scheduleItem.create).not.toHaveBeenCalled();
  });

  it('permite contrato temporario do mesmo bem quando o periodo nao conflita', async () => {
    const contractFindFirst = jest.fn().mockResolvedValue(null);
    const { service, tx } = createService({
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: 'company-1' }),
      },
      property: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'property-1',
          companyId: 'company-1',
          isActive: true,
        }),
      },
      person: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tenant-1',
          companyId: 'company-1',
          status: 'ACTIVE',
        }),
      },
      contract: {
        findFirst: contractFindFirst,
      },
    } as Partial<PrismaService>);
    tx.contract.create.mockResolvedValue({
      ...contract,
      isTemporaryRental: true,
    });
    tx.contaReceber.findMany.mockResolvedValue([]);

    await service.create(
      {
        propertyId: 'property-1',
        tenantId: 'tenant-1',
        propertyName: 'Imovel',
        tenantName: 'Pessoa',
        startDate: '2026-09-01',
        endDate: '2026-09-05',
        rentValue: 1000,
        status: ContractStatus.ACTIVE,
        isTemporaryRental: true,
      },
      'company-1',
    );

    expect(contractFindFirst).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        propertyId: 'property-1',
        status: {
          in: [ContractStatus.ACTIVE],
        },
        startDate: { lte: new Date('2026-09-05T00:00:00') },
        endDate: { gte: new Date('2026-09-01T00:00:00') },
      },
    });
    expect(tx.contract.create).toHaveBeenCalled();
    expect(tx.contaReceber.create).not.toHaveBeenCalled();
  });

  it('permite contrato padrao quando o mesmo bem tem apenas contrato temporario ativo', async () => {
    const contractFindFirst = jest.fn().mockResolvedValue(null);
    const { service, tx } = createService({
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: 'company-1' }),
      },
      property: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'property-1',
          companyId: 'company-1',
          isActive: true,
        }),
      },
      person: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tenant-1',
          companyId: 'company-1',
          status: 'ACTIVE',
        }),
      },
      contract: {
        findFirst: contractFindFirst,
      },
    } as Partial<PrismaService>);

    await service.create(
      {
        propertyId: 'property-1',
        tenantId: 'tenant-1',
        propertyName: 'Imovel',
        tenantName: 'Pessoa',
        startDate: '2026-09-01',
        endDate: '2026-12-01',
        rentValue: 1000,
        status: ContractStatus.ACTIVE,
        isTemporaryRental: false,
      },
      'company-1',
    );

    expect(contractFindFirst).toHaveBeenCalledWith({
      where: {
        companyId: 'company-1',
        propertyId: 'property-1',
        status: {
          in: [ContractStatus.ACTIVE],
        },
        endDate: {
          gte: new Date('2026-06-10T00:00:00'),
        },
        isTemporaryRental: false,
      },
    });
    expect(tx.contract.create).toHaveBeenCalled();
    expect(tx.contaReceber.create).not.toHaveBeenCalled();
  });

  it('bloqueia contrato temporario do mesmo bem quando o periodo conflita', async () => {
    const { service, transactionMock } = createService({
      company: {
        findUnique: jest.fn().mockResolvedValue({ id: 'company-1' }),
      },
      property: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'property-1',
          companyId: 'company-1',
          isActive: true,
        }),
      },
      person: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'tenant-1',
          companyId: 'company-1',
          status: 'ACTIVE',
        }),
      },
      contract: {
        findFirst: jest.fn().mockResolvedValue({
          id: 'contract-existing',
        }),
      },
    } as Partial<PrismaService>);

    await expect(
      service.create(
        {
          propertyId: 'property-1',
          tenantId: 'tenant-1',
          propertyName: 'Imovel',
          tenantName: 'Pessoa',
          startDate: '2026-09-01',
          endDate: '2026-09-05',
          rentValue: 1000,
          status: ContractStatus.ACTIVE,
          isTemporaryRental: true,
        },
        'company-1',
      ),
    ).rejects.toThrow('Este bem/ativo ja possui contrato ativo nesse periodo.');
    expect(transactionMock).not.toHaveBeenCalled();
  });

  it('renova contrato e gera parcelas faltantes no mesmo padrao da criacao', async () => {
    const renewedContract = {
      ...contract,
      endDate: new Date('2026-08-31T00:00:00'),
      rentValue: new Prisma.Decimal(1200),
      renewedAt: new Date('2026-06-01T00:00:00'),
      renewalHistory: [
        {
          renewedAt: '2026-06-01T00:00:00.000Z',
          previousEndDate: '2026-05-31',
          newEndDate: '2026-08-31',
          previousRentValue: 1000,
          newRentValue: 1200,
        },
      ],
    };
    const { service, tx } = createService();

    tx.contract.update.mockResolvedValue(renewedContract);
    tx.contaReceber.findMany.mockResolvedValue([
      {
        id: 'paid-receivable-1',
        status: FinancialAccountStatus.PAID,
      },
    ]);

    await service.renew(
      'contract-1',
      { endDate: '2026-08-31', rentValue: 1200 },
      'company-1',
    );

    expect(tx.contract.update).toHaveBeenCalledWith({
      where: { id: 'contract-1' },
      data: {
        endDate: new Date('2026-08-31T00:00:00'),
        rentValue: new Prisma.Decimal(1200),
        status: ContractStatus.ACTIVE,
        renewedAt: new Date('2026-06-10T12:00:00.000Z'),
        renewalHistory: [
          {
            renewedAt: '2026-06-10T12:00:00.000Z',
            previousEndDate: '2026-05-31',
            newEndDate: '2026-08-31',
            previousRentValue: 1000,
            newRentValue: 1200,
            notes: undefined,
          },
        ],
        finishedAt: null,
        finishReason: null,
      },
      include: {
        company: true,
        property: true,
        tenant: true,
      },
    });
    expect(tx.contaReceber.create).toHaveBeenCalledTimes(2);
    expect(tx.contaReceber.create).toHaveBeenCalledWith({
      data: {
        company: {
          connect: {
            id: 'company-1',
          },
        },
        contract: {
          connect: {
            id: 'contract-1',
          },
        },
        tenant: {
          connect: {
            id: 'tenant-1',
          },
        },
        propertyName: 'Imovel',
        tenantName: 'Pessoa',
        issueDate: new Date('2026-05-01T00:00:00'),
        dueDate: new Date('2026-07-01T00:00:00'),
        amount: new Prisma.Decimal(1200),
        status: FinancialAccountStatus.PENDING,
        manual: false,
        installmentNumber: 2,
        installmentTotal: 3,
        installmentGroupId: 'contract-1-installments',
        isDownPayment: false,
      },
    });
    expect(tx.contaReceber.create).toHaveBeenCalledWith({
      data: {
        company: {
          connect: {
            id: 'company-1',
          },
        },
        contract: {
          connect: {
            id: 'contract-1',
          },
        },
        tenant: {
          connect: {
            id: 'tenant-1',
          },
        },
        propertyName: 'Imovel',
        tenantName: 'Pessoa',
        issueDate: new Date('2026-05-01T00:00:00'),
        dueDate: new Date('2026-08-01T00:00:00'),
        amount: new Prisma.Decimal(1200),
        status: FinancialAccountStatus.PENDING,
        manual: false,
        installmentNumber: 3,
        installmentTotal: 3,
        installmentGroupId: 'contract-1-installments',
        isDownPayment: false,
      },
    });
  });

  it('bloqueia renovacao com data final menor ou igual a atual', async () => {
    const { service } = createService();

    await expect(
      service.renew(
        'contract-1',
        { endDate: '2026-05-31', rentValue: 1200 },
        'company-1',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('bloqueia finalizacao quando existem contas a receber em aberto', async () => {
    const countMock = jest.fn().mockResolvedValue(2);
    const { service, transactionMock } = createService({
      contaReceber: {
        count: countMock,
      },
    } as Partial<PrismaService>);

    await expect(
      service.finish('contract-1', { reason: 'Motivo valido' }, 'company-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(countMock).toHaveBeenCalledWith({
      where: {
        contractId: 'contract-1',
        companyId: 'company-1',
        status: { not: FinancialAccountStatus.PAID },
      },
    });
    expect(transactionMock).not.toHaveBeenCalled();
  });
});
