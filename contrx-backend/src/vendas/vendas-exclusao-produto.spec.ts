import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from './vendas.service';

describe('Exclusão de produto sem operação comercial', () => {
  function fixture(reasons: string[] = [], orders: unknown[] = []) {
    const tx = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      salesProduct: {
        findFirst: jest.fn().mockResolvedValue({ id: 'product' }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      salesOrder: { findMany: jest.fn().mockResolvedValue(orders) },
      salesStockMovement: {
        count: jest
          .fn()
          .mockImplementation(
            ({ where }) =>
              reasons.filter(
                (reason) =>
                  !where.NOT.OR.some(
                    (condition: { reason: string | { startsWith: string } }) =>
                      typeof condition.reason === 'string'
                        ? condition.reason === reason
                        : reason.startsWith(condition.reason.startsWith),
                  ),
              ).length,
          ),
        deleteMany: jest.fn().mockResolvedValue({ count: reasons.length }),
      },
      salesProductVariant: {
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
    };
    const prisma = {
      appSettings: {
        findUnique: jest.fn().mockResolvedValue({
          companySettings: { ramoAtividade: 'CONFECCOES' },
        }),
      },
      $transaction: jest.fn().mockImplementation((work) => work(tx)),
    };
    return {
      tx,
      service: new VendasService(prisma as unknown as PrismaService),
    };
  }

  it.each([
    { reasons: [] },
    { reasons: ['ESTOQUE INICIAL DO CADASTRO'] },
    {
      reasons: [
        'ESTOQUE INICIAL DO CADASTRO',
        'AJUSTE MANUAL NO CADASTRO',
        'DISTRIBUIÇÃO DA VARIAÇÃO P: 3',
      ],
    },
  ])(
    'permite excluir produto apenas com registros do cadastro: $reasons',
    async ({ reasons }) => {
      const { service, tx } = fixture(reasons);
      await expect(
        service.deleteProduct('company', 'product'),
      ).resolves.toEqual({ success: true });
      expect(tx.salesProduct.deleteMany).toHaveBeenCalledWith({
        where: { id: 'product', companyId: 'company' },
      });
      expect(tx.salesStockMovement.deleteMany).toHaveBeenCalledWith({
        where: { productId: 'product', companyId: 'company' },
      });
    },
  );

  it.each(['VENDA', 'CONDICIONAL', 'PEDIDO', 'ORCAMENTO', 'TROCA'])(
    'bloqueia produto vinculado a %s mesmo sem baixa de estoque',
    async (saleType) => {
      const { service, tx } = fixture(
        [],
        [{ saleType, items: [{ productId: 'product' }] }],
      );
      await expect(service.deleteProduct('company', 'product')).rejects.toThrow(
        'vinculado',
      );
      expect(tx.salesProduct.deleteMany).not.toHaveBeenCalled();
      expect(tx.salesStockMovement.deleteMany).not.toHaveBeenCalled();
    },
  );

  it('bloqueia vínculo de devolução e movimentos operacionais sem documento disponível', async () => {
    for (const f of [
      fixture([], [{ items: [], returnedItems: [{ productId: 'product' }] }]),
      fixture(['SAÍDA POR VENDA']),
    ]) {
      await expect(
        f.service.deleteProduct('company', 'product'),
      ).rejects.toThrow('vinculado');
      expect(f.tx.salesProduct.deleteMany).not.toHaveBeenCalled();
    }
  });

  it('não exclui produto de outra empresa', async () => {
    const { service, tx } = fixture();
    tx.salesProduct.findFirst.mockResolvedValueOnce(null);
    await expect(
      service.deleteProduct('company', 'foreign-product'),
    ).rejects.toThrow('encontrado');
    expect(tx.salesProduct.deleteMany).not.toHaveBeenCalled();
  });
});
