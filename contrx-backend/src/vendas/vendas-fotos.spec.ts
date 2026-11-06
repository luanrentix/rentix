import { PrismaService } from '../prisma/prisma.service';
import { VendasService } from './vendas.service';

function fixture() {
  const prisma = {
    appSettings: {
      findUnique: jest.fn().mockResolvedValue({
        companySettings: { ramoAtividade: 'CONFECCOES' },
      }),
    },
    salesProduct: {
      findMany: jest.fn().mockResolvedValue([
        {
          id: 'product',
          isGridParent: false,
          parentProductId: null,
          name: 'CAMISA',
        },
      ]),
    },
    systemFile: {
      findMany: jest
        .fn()
        .mockResolvedValue([
          { entityId: 'product', url: 'data:image/png;base64,photo' },
        ]),
    },
  };
  return {
    prisma,
    service: new VendasService(prisma as unknown as PrismaService),
  };
}
describe('Fotos no catálogo de Confecções', () => {
  it('consulta somente imagens dos produtos da empresa autenticada', async () => {
    const f = fixture();
    const products = await f.service.listProducts('company');
    expect(products[0].photoUrl).toBe('data:image/png;base64,photo');
    expect(f.prisma.systemFile.findMany).toHaveBeenCalledWith({
      where: {
        companyId: 'company',
        entityType: 'OTHER',
        type: 'IMAGE',
        entityId: { in: ['product'] },
      },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      distinct: ['entityId'],
      select: { entityId: true, url: true },
    });
  });
  it('mantém produto sem foto com imagem nula', async () => {
    const f = fixture();
    f.prisma.systemFile.findMany.mockResolvedValue([]);
    expect((await f.service.listProducts('company'))[0].photoUrl).toBeNull();
  });
  it('usa a foto da matriz quando o produto da grade não possui imagem própria', async () => {
    const f = fixture();
    f.prisma.salesProduct.findMany.mockResolvedValue([
      {
        id: 'parent',
        isGridParent: true,
        parentProductId: null,
        name: 'CAMISA',
        gridChildren: [],
      },
      {
        id: 'product',
        isGridParent: false,
        parentProductId: 'parent',
        name: 'CAMISA M',
      },
    ] as never);
    f.prisma.systemFile.findMany.mockResolvedValue([
      { entityId: 'parent', url: 'data:image/png;base64,parent' },
    ]);
    expect((await f.service.listProducts('company'))[1].photoUrl).toBe(
      'data:image/png;base64,parent',
    );
  });
  it('não consulta anexos quando não há produtos', async () => {
    const f = fixture();
    f.prisma.salesProduct.findMany.mockResolvedValue([]);
    expect(await f.service.listProducts('company')).toEqual([]);
    expect(f.prisma.systemFile.findMany).not.toHaveBeenCalled();
  });
});
