import { BadRequestException } from '@nestjs/common';
import { ContractStatus, FinancialAccountStatus, Prisma } from '@prisma/client';
import { ContratosService } from './contratos.service';
import { PrismaService } from '../prisma/prisma.service';

describe('ContratosService', () => {
  const contract = {
    id: 'contract-1',
    companyId: 'company-1',
    propertyId: 'property-1',
    tenantId: 'tenant-1',
    propertyName: 'Imovel',
    tenantName: 'Inquilino',
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
    const prisma = {
      contract: {
        findFirst: jest.fn().mockResolvedValue(contract),
      },
      $transaction: jest.fn((callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
      ...prismaOverrides,
    } as unknown as PrismaService;

    return {
      service: new ContratosService(prisma),
      prisma,
      tx,
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

  it('cria contrato ativo sem gerar parcelas antes dos ajustes manuais', async () => {
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
          isTenant: true,
        }),
      },
      contract: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    } as Partial<PrismaService>);

    await service.create(
      {
        companyId: 'company-1',
        propertyId: 'property-1',
        tenantId: 'tenant-1',
        propertyName: 'Imovel',
        tenantName: 'Inquilino',
        startDate: '2026-05-01',
        endDate: '2026-08-01',
        rentValue: 1000,
        status: ContractStatus.ACTIVE,
      },
      'company-1',
    );

    expect(tx.contract.create).toHaveBeenCalled();
    expect(tx.contaReceber.create).not.toHaveBeenCalled();
    expect(tx.scheduleItem.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        companyId: 'company-1',
        title: 'Vencimento de contrato',
        type: 'Contrato',
        status: 'scheduled',
      }),
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
});
