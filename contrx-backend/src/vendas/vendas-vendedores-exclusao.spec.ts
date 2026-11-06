import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from './vendas.service';
function fixture() {
  const tx = {
    $queryRaw: jest.fn(),
    salesSeller: {
      findFirst: jest.fn().mockResolvedValue({ id: 'seller' }),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
    },
    salesOrder: { count: jest.fn().mockResolvedValue(0) },
  };
  const prisma = {
    appSettings: {
      findUnique: jest.fn().mockResolvedValue({
        companySettings: { ramoAtividade: 'CONFECCOES' },
      }),
    },
    $transaction: jest
      .fn()
      .mockImplementation(async (callback) => callback(tx)),
  };
  return { tx, service: new VendasService(prisma as unknown as PrismaService) };
}
describe('Exclusão de vendedor', () => {
  it('exclui somente vendedor da empresa sem histórico', async () => {
    const f = fixture();
    await f.service.deleteSeller('company', 'seller');
    expect(f.tx.salesSeller.deleteMany).toHaveBeenCalledWith({
      where: { id: 'seller', companyId: 'company' },
    });
  });
  it('preserva vínculo com qualquer documento histórico, inclusive encerrado', async () => {
    const f = fixture();
    f.tx.salesOrder.count.mockResolvedValue(1);
    await expect(f.service.deleteSeller('company', 'seller')).rejects.toThrow(
      'histórico',
    );
    expect(f.tx.salesOrder.count).toHaveBeenCalledWith({
      where: { companyId: 'company', sellerId: 'seller' },
    });
    expect(f.tx.salesSeller.deleteMany).not.toHaveBeenCalled();
  });
  it('recusa vendedor inexistente na empresa', async () => {
    const f = fixture();
    f.tx.salesSeller.findFirst.mockResolvedValue(null);
    await expect(
      f.service.deleteSeller('company', 'other-seller'),
    ).rejects.toThrow('não encontrado');
  });
});
