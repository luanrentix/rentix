import { Prisma } from '@prisma/client';
import { formatCatalogProduct, syncGridProducts } from './grid-products';

describe('Cadastros independentes da grade', () => {
  const decimal = (value: number) => new Prisma.Decimal(value);
  function fixture() {
    const parent = {
      id: 'parent',
      companyId: 'company',
      name: 'PIJAMA',
      sku: '100',
      price: decimal(100),
      promotionalPrice: null,
      stock: decimal(0),
      reservedStock: decimal(0),
      inheritGridPrice: true,
      isGridParent: true,
      active: true,
      showInSale: true,
    } as Parameters<typeof syncGridProducts>[2];
    const children: Array<Record<string, any>> = [];
    const tx = {
      salesProduct: {
        findMany: jest
          .fn()
          .mockImplementation(({ where }) =>
            where.parentProductId
              ? children.filter(
                  (child) =>
                    child.parentProductId === where.parentProductId &&
                    child.companyId === where.companyId,
                )
              : [parent, ...children],
          ),
        create: jest.fn().mockImplementation(({ data }) => {
          const row = {
            reservedStock: decimal(0),
            updatedAt: new Date('2026-11-05T12:00:00Z'),
            ...data,
          };
          children.push(row);
          return row;
        }),
        update: jest.fn().mockImplementation(({ where, data }) =>
          Object.assign(
            children.find((child) => child.id === where.id)!,
            data,
          ),
        ),
        updateMany: jest.fn().mockImplementation(({ where, data }) => {
          const found = children.filter((child) =>
            where.id.in.includes(child.id),
          );
          found.forEach((child) => Object.assign(child, data));
          return { count: found.length };
        }),
      },
      salesStockMovement: { create: jest.fn().mockResolvedValue({}) },
    };
    const barcode = jest.fn().mockResolvedValue(undefined);
    const sync = (inputs: Parameters<typeof syncGridProducts>[3]) =>
      syncGridProducts(
        tx as unknown as Prisma.TransactionClient,
        'company',
        parent,
        inputs,
        barcode,
      );
    return { parent, children, tx, barcode, sync };
  }

  it('gera códigos distintos e estoques próprios sem duplicar estoque na matriz', async () => {
    const f = fixture();
    await f.sync([
      { name: 'P', stock: 3, barcode: '111' },
      { name: 'M', stock: 5, barcode: '222' },
    ]);
    expect(
      f.children.map((child) => [
        child.name,
        child.sku,
        child.stock.toNumber(),
        child.parentProductId,
      ]),
    ).toEqual([
      ['PIJAMA - P', '100-P', 3, 'parent'],
      ['PIJAMA - M', '100-M', 5, 'parent'],
    ]);
    expect(f.parent.stock.toNumber()).toBe(0);
    expect(
      f.tx.salesStockMovement.create.mock.calls.map(
        ([args]) => args.data.productId,
      ),
    ).toEqual(f.children.map((child) => child.id));
    const formatted = formatCatalogProduct({
      ...f.parent,
      gridChildren: f.children,
      variants: [],
      supplier: null,
      parentProduct: null,
    } as unknown as Parameters<typeof formatCatalogProduct>[0]);
    expect(formatted.stock.toNumber()).toBe(8);
    expect(formatted.variants).toHaveLength(2);
  });

  it('atualiza o cadastro existente sem gerar duplicata e preserva o outro estoque', async () => {
    const f = fixture();
    await f.sync([
      { name: 'P', stock: 3 },
      { name: 'M', stock: 5 },
    ]);
    const inputs = f.children.map((child) => ({
      id: child.id,
      name: child.gridValue,
      stock: child.stock.toNumber(),
      expectedUpdatedAt: child.updatedAt.toISOString(),
    }));
    inputs[0].stock = 4;
    await f.sync(inputs);
    expect(f.children).toHaveLength(2);
    expect(f.children.map((child) => child.stock.toNumber())).toEqual([4, 5]);
  });

  it('usa o codigo da matriz com tamanhos e cores', async () => {
    const f = fixture();
    f.parent.sku = '5';
    await f.sync([
      { name: 'M', stock: 1 },
      { name: 'G', stock: 2 },
      { name: ' azul ', stock: 3 },
    ]);
    expect(f.children.map((child) => child.sku)).toEqual([
      '5-M',
      '5-G',
      '5-AZUL',
    ]);
  });

  it('recalcula o codigo ao renomear uma opcao sem trocar o ID ou o estoque', async () => {
    const f = fixture();
    await f.sync([{ name: 'P', stock: 3 }]);
    const child = f.children[0];
    await f.sync([
      {
        id: child.id,
        name: 'M',
        stock: 3,
        expectedUpdatedAt: child.updatedAt.toISOString(),
      },
    ]);
    expect(f.children).toHaveLength(1);
    expect(child.sku).toBe('100-M');
    expect(child.stock.toNumber()).toBe(3);
  });

  it('rejeita conflito de codigo com outro produto da mesma empresa', async () => {
    const f = fixture();
    f.children.push({ id: 'other', companyId: 'company', sku: '100-M' });
    await expect(f.sync([{ name: 'M', stock: 0 }])).rejects.toThrow(
      'já está cadastrado',
    );
  });

  it('permite preço independente quando não herda o preço da matriz', async () => {
    const f = fixture();
    f.parent.inheritGridPrice = false;
    await f.sync([{ name: 'P', stock: 0, price: 80 }]);
    expect(f.children[0].price.toNumber()).toBe(80);
  });

  it('rejeita identificador de outro produto ou empresa', async () => {
    const f = fixture();
    await expect(
      f.sync([{ id: 'foreign-child', name: 'P', stock: 1 }]),
    ).rejects.toThrow('não pertence');
    expect(f.children).toHaveLength(0);
  });

  it('não sobrescreve estoque atualizado depois da abertura da matriz', async () => {
    const f = fixture();
    await f.sync([{ name: 'P', stock: 3 }]);
    await expect(
      f.sync([
        {
          id: f.children[0].id,
          name: 'P',
          stock: 9,
          expectedUpdatedAt: '2026-11-04T12:00:00Z',
        },
      ]),
    ).rejects.toThrow('foi atualizado');
    expect(f.children[0].stock.toNumber()).toBe(3);
  });

  it('protege reservas de condicionais ao remover opção da grade', async () => {
    const f = fixture();
    await f.sync([{ name: 'P', stock: 3 }]);
    f.children[0].reservedStock = decimal(1);
    await expect(f.sync([])).rejects.toThrow('reserva em condicional');
    expect(f.children[0].active).toBe(true);
  });

  it('desativa opção retirada da grade sem apagar seu estoque ou cadastro', async () => {
    const f = fixture();
    await f.sync([{ name: 'P', stock: 3 }]);
    await f.sync([]);
    expect(f.children[0].active).toBe(false);
    expect(f.children[0].stock.toNumber()).toBe(3);
  });

  it('rejeita opções duplicadas', async () => {
    const f = fixture();
    await expect(
      f.sync([
        { name: 'P', stock: 1 },
        { name: ' p ', stock: 1 },
      ]),
    ).rejects.toThrow('únicas');
  });

  it('reativa opção já cadastrada sem perder o estoque independente', async () => {
    const f = fixture();
    await f.sync([{ name: 'P', stock: 3, barcode: '123' }]);
    await f.sync([]);
    await f.sync([{ name: 'P', stock: 0 }]);
    expect(f.children).toHaveLength(1);
    expect(f.children[0].active).toBe(true);
    expect(f.children[0].stock.toNumber()).toBe(3);
    expect(f.children[0].barcode).toBe('123');
  });
});
