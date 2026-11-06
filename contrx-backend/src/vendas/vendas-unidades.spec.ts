import { VendasService } from './vendas.service';
import { PrismaService } from '../prisma/prisma.service';

describe('Unidades de produtos de vendas', () => {
  function fixture() {
    const prisma = {
      appSettings: {
        findUnique: jest.fn().mockResolvedValue({
          companySettings: { ramoAtividade: 'CONFECCOES' },
        }),
      },
      salesProductUnit: {
        findMany: jest.fn().mockResolvedValue([{ id: 'custom', name: 'DZ' }]),
        upsert: jest.fn().mockResolvedValue({ id: 'custom', name: 'DZ' }),
      },
      salesProduct: {
        findMany: jest.fn().mockResolvedValue([{ unit: 'FD' }, { unit: 'UN' }]),
      },
    };
    return {
      prisma,
      service: new VendasService(prisma as unknown as PrismaService),
    };
  }

  it('mantém unidades padrão, cadastradas e já utilizadas, consultando apenas a empresa atual', async () => {
    const { service, prisma } = fixture();
    const units = await service.listProductUnits('company');
    expect(units.map((unit) => unit.name)).toEqual(
      expect.arrayContaining(['UN', 'KG', 'DZ', 'FD']),
    );
    expect(units.filter((unit) => unit.name === 'UN')).toHaveLength(1);
    expect(prisma.salesProductUnit.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company', active: true },
      }),
    );
    expect(prisma.salesProduct.findMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { companyId: 'company' } }),
    );
  });

  it('normaliza a sigla e evita duplicação dentro da empresa', async () => {
    const { service, prisma } = fixture();
    await service.createProductUnit('company', { name: ' dz ' });
    expect(prisma.salesProductUnit.upsert).toHaveBeenCalledWith({
      where: { companyId_name: { companyId: 'company', name: 'DZ' } },
      create: { companyId: 'company', name: 'DZ' },
      update: { active: true },
    });
  });

  it.each(['   ', 'ABCDEFGHIJKLM'])(
    'rejeita unidade inválida: %s',
    async (name) => {
      const { service, prisma } = fixture();
      await expect(
        service.createProductUnit('company', { name }),
      ).rejects.toThrow('até 12 caracteres');
      expect(prisma.salesProductUnit.upsert).not.toHaveBeenCalled();
    },
  );
});
