import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from './vendas.service';

describe('Clientes protegidos do sistema', () => {
  function fixture() {
    const records = new Map<string, object>();
    const prisma = {
      appSettings: {
        findUnique: jest.fn().mockResolvedValue({
          companySettings: { ramoAtividade: 'CONFECCOES' },
        }),
      },
      salesCustomer: {
        upsert: jest.fn().mockImplementation(({ create }) => {
          const key = `${create.companyId}:${create.systemKey}`;
          if (!records.has(key)) records.set(key, create);
          return records.get(key);
        }),
        findMany: jest.fn().mockResolvedValue([]),
        findFirst: jest.fn().mockResolvedValue({ isSystem: true }),
        updateMany: jest.fn(),
        create: jest.fn(),
      },
    };
    return {
      service: new VendasService(prisma as unknown as PrismaService),
      prisma,
      records,
    };
  }

  it('garante os dois cadastros por empresa sem duplicar em novas consultas', async () => {
    const { service, prisma, records } = fixture();
    await service.listCustomers('empresa');
    await service.listCustomers('empresa');
    expect(records.size).toBe(2);
    expect(records.get('empresa:CLIENTE_CARTAO')).toMatchObject({
      name: 'CLIENTE CARTÃO',
      isSystem: true,
    });
    expect(records.get('empresa:CONSUMIDOR_FINAL')).toMatchObject({
      name: 'CONSUMIDOR FINAL',
      isSystem: true,
    });
    expect(prisma.salesCustomer.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          companyId_systemKey: {
            companyId: 'empresa',
            systemKey: 'CLIENTE_CARTAO',
          },
        },
        update: {},
      }),
    );
    expect(prisma.salesCustomer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'empresa', active: true },
      }),
    );
    await service.listCustomers('outra');
    expect(records.size).toBe(4);
  });

  it('impede editar ou inativar o cliente protegido', async () => {
    const { service, prisma } = fixture();
    await expect(
      service.updateCustomer('empresa', 'cartao', { name: 'OUTRO' }),
    ).rejects.toThrow('protegido');
    await expect(service.archiveCustomer('empresa', 'cartao')).rejects.toThrow(
      'inativado',
    );
    expect(prisma.salesCustomer.updateMany).not.toHaveBeenCalled();
  });

  it.each(['CLIENTE CARTÃO', 'cliente cartao', 'CONSUMIDOR FINAL'])(
    'reserva o nome %s no cadastro manual',
    async (name) => {
      const { service, prisma } = fixture();
      await expect(
        service.createCustomer('empresa', {
          personType: 'INDIVIDUAL',
          name,
          referenceOnly: true,
        }),
      ).rejects.toThrow('reservado');
      prisma.salesCustomer.findFirst.mockResolvedValue({ isSystem: false });
      await expect(
        service.updateCustomer('empresa', 'comum', { name }),
      ).rejects.toThrow('reservado');
      expect(prisma.salesCustomer.create).not.toHaveBeenCalled();
      expect(prisma.salesCustomer.updateMany).not.toHaveBeenCalled();
    },
  );
});
