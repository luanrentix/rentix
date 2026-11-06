import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from './vendas.service';

describe('Exclusão de cliente sem movimentação', () => {
  function fixture() {
    const tx = {
      $executeRaw: jest.fn(),
      $queryRaw: jest.fn(),
      salesCustomer: {
        findFirst: jest
          .fn()
          .mockResolvedValue({ id: 'cliente', isSystem: false }),
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      salesOrder: { count: jest.fn().mockResolvedValue(0) },
      salesCustomerCredit: { count: jest.fn().mockResolvedValue(0) },
      salesCreditAdjustment: { count: jest.fn().mockResolvedValue(0) },
      systemFile: { deleteMany: jest.fn() },
    };
    const prisma = {
      appSettings: {
        findUnique: jest.fn().mockResolvedValue({
          companySettings: { ramoAtividade: 'CONFECCOES' },
        }),
      },
      $transaction: jest.fn().mockImplementation((callback) => callback(tx)),
    };
    return {
      tx,
      service: new VendasService(prisma as unknown as PrismaService),
    };
  }
  it('exclui somente o cliente da empresa e seus vínculos administrativos', async () => {
    const { tx, service } = fixture();
    await expect(service.deleteCustomer('empresa', 'cliente')).resolves.toEqual(
      { success: true },
    );
    expect(tx.salesCustomer.findFirst).toHaveBeenCalledWith({
      where: { id: 'cliente', companyId: 'empresa' },
    });
    expect(tx.salesOrder.count).toHaveBeenCalledWith({
      where: { companyId: 'empresa', customerId: 'cliente' },
    });
    expect(tx.salesCustomer.deleteMany).toHaveBeenCalledWith({
      where: { id: 'cliente', companyId: 'empresa', isSystem: false },
    });
    expect(tx.systemFile.deleteMany).toHaveBeenCalledWith({
      where: { companyId: 'empresa', entityType: 'OTHER', entityId: 'cliente' },
    });
  });
  it('bloqueia qualquer documento vinculado sem filtrar por tipo ou situação', async () => {
    const { tx, service } = fixture();
    tx.salesOrder.count.mockResolvedValue(1);
    await expect(service.deleteCustomer('empresa', 'cliente')).rejects.toThrow(
      'movimentação',
    );
    expect(tx.salesOrder.count).toHaveBeenCalledWith({
      where: { companyId: 'empresa', customerId: 'cliente' },
    });
    expect(tx.salesCustomer.deleteMany).not.toHaveBeenCalled();
  });
  it('bloqueia crédito vinculado mesmo sem pedido encontrado', async () => {
    const { tx, service } = fixture();
    tx.salesCustomerCredit.count.mockResolvedValue(1);
    await expect(service.deleteCustomer('empresa', 'cliente')).rejects.toThrow(
      'movimentação',
    );
    expect(tx.salesCustomer.deleteMany).not.toHaveBeenCalled();
  });
  it('protege cadastros do sistema', async () => {
    const { tx, service } = fixture();
    tx.salesCustomer.findFirst.mockResolvedValue({
      id: 'cliente',
      isSystem: true,
    });
    await expect(service.deleteCustomer('empresa', 'cliente')).rejects.toThrow(
      'protegido',
    );
    expect(tx.salesCustomer.deleteMany).not.toHaveBeenCalled();
  });
  it('preserva cliente com ajustes de crédito mesmo sem venda vinculada', async () => {
    const { tx, service } = fixture();
    tx.salesCreditAdjustment.count.mockResolvedValue(1);
    await expect(service.deleteCustomer('empresa', 'cliente')).rejects.toThrow(
      'movimentação',
    );
    expect(tx.salesCustomer.deleteMany).not.toHaveBeenCalled();
  });
  it('não exclui identificador inexistente na empresa', async () => {
    const { tx, service } = fixture();
    tx.salesCustomer.findFirst.mockResolvedValue(null);
    await expect(service.deleteCustomer('empresa', 'cliente')).rejects.toThrow(
      'não encontrado',
    );
    expect(tx.salesCustomer.deleteMany).not.toHaveBeenCalled();
  });
});
