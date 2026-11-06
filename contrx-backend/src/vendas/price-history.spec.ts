import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from './vendas.service';

describe('Historico de precos por empresa', () => {
  function fixture() {
    const db = {
      salesProduct: {
        findFirst: jest.fn().mockResolvedValue({ id: 'product' }),
      },
      salesProductPriceHistory: {
        findFirst: jest.fn().mockResolvedValue(null),
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    return { db, service: new VendasService(db as unknown as PrismaService) };
  }
  it('nao retorna historico para produto de outra empresa', async () => {
    const { db, service } = fixture();
    db.salesProduct.findFirst.mockResolvedValue(null);
    await expect(
      service.listProductPriceHistory('A', 'foreign'),
    ).rejects.toThrow('Produto não encontrado');
    expect(db.salesProduct.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign', companyId: 'A' },
      select: { id: true },
    });
    expect(db.salesProductPriceHistory.findMany).not.toHaveBeenCalled();
  });
  it('rejeita cursor de outro produto ou empresa', async () => {
    const { db, service } = fixture();
    await expect(
      service.listProductPriceHistory('A', 'product', 'foreign-cursor'),
    ).rejects.toThrow('inválida');
    expect(db.salesProductPriceHistory.findFirst).toHaveBeenCalledWith({
      where: { id: 'foreign-cursor', companyId: 'A', productId: 'product' },
      select: { id: true },
    });
  });
  it('pagina sem omitir o proximo registro e filtra empresa e produto', async () => {
    const { db, service } = fixture();
    db.salesProductPriceHistory.findMany.mockResolvedValue(
      Array.from({ length: 51 }, (_, index) => ({ id: `entry-${index}` })),
    );
    const result = await service.listProductPriceHistory('A', 'product');
    expect(result.records).toHaveLength(50);
    expect(result.nextCursor).toBe('entry-49');
    expect(db.salesProductPriceHistory.findMany).toHaveBeenCalledWith({
      where: { companyId: 'A', productId: 'product' },
      orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      take: 51,
    });
  });
});
