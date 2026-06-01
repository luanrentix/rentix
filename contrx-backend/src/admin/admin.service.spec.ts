import { AdminService } from './admin.service';

function createService() {
  const tx = {
    contaReceber: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    pagamentoRecebido: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    contaPagar: {
      findMany: jest.fn().mockResolvedValue([]),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    pagamentoRealizado: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    contract: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    propertyMovement: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    property: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    person: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    scheduleItem: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
    user: {
      deleteMany: jest.fn().mockResolvedValue({ count: 3 }),
    },
  };

  const prisma = {
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
  };

  return {
    service: new AdminService(prisma as never),
    prisma,
    tx,
  };
}

describe('AdminService', () => {
  it('apaga usuarios do painel master preservando o usuario atual e o dono do sistema', async () => {
    const { service, tx } = createService();

    const result = await service.resetTestData('company-1', 'current-user', [
      'masterPanel',
    ]);

    expect(tx.user.deleteMany).toHaveBeenCalledWith({
      where: {
        id: { not: 'current-user' },
        email: { not: 'adm@contrx.com' },
      },
    });
    expect(result).toEqual({
      success: true,
      modules: ['masterPanel'],
      deletedRecords: {
        masterPanel: 3,
      },
    });
  });
});
