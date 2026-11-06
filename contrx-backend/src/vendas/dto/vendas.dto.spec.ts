import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { CriarProdutoVendaDto } from './criar-produto-venda.dto';
import { CriarVendaDto } from './criar-venda.dto';

const id = '11111111-1111-4111-8111-111111111111';
const sale = {
  requestId: id,
  customerId: id,
  sellerId: id,
  customerName: 'CLIENTE',
  sellerName: 'VENDEDOR',
  saleType: 'VENDA',
  paymentMethod: 'DINHEIRO',
  discount: 0,
  addition: 0,
  status: 'CONCLUIDA',
  items: [{ productId: id, quantity: 1 }],
};

describe('Contratos HTTP de Vendas', () => {
  it('aceita quantidade com três casas decimais e recusa zero ou precisão maior', async () => {
    for (const [quantity, valid] of [
      [0.001, true],
      [0, false],
      [0.0001, false],
    ] as const) {
      const dto = plainToInstance(CriarVendaDto, {
        ...sale,
        items: [{ productId: id, quantity }],
      });
      expect((await validate(dto)).length === 0).toBe(valid);
    }
  });

  it('valida o índice e a quantidade dos itens devolvidos', async () => {
    const dto = plainToInstance(CriarVendaDto, {
      ...sale,
      saleType: 'TROCA',
      originalOrderId: id,
      items: [],
      returnedItems: [{ itemIndex: -1, quantity: 0 }],
    });
    expect(
      (await validate(dto)).some((error) => error.property === 'returnedItems'),
    ).toBe(true);
  });

  it('aceita devolução sem produtos novos e valor de diferença negativo', async () => {
    const dto = plainToInstance(CriarVendaDto, {
      ...sale,
      saleType: 'TROCA',
      originalOrderId: id,
      items: [],
      returnedItems: [{ itemIndex: 0, quantity: 1 }],
      expectedTotal: -100,
      returnDisposition: 'CREDIT',
    });
    expect(await validate(dto)).toEqual([]);
  });

  it('aceita cadastro rápido sem custos e converte os números das variações', async () => {
    const dto = plainToInstance(CriarProdutoVendaDto, {
      name: 'CAMISA',
      price: 100,
      category: 'ROUPAS',
      brand: 'MARCA',
      manageStock: true,
      variants: [
        { name: 'P / AZUL', barcode: '789123', stock: '3.5', price: '120.50' },
      ],
    });
    expect(await validate(dto)).toEqual([]);
    expect(dto.variants?.[0].stock).toBe(3.5);
    expect(dto.variants?.[0].price).toBe(120.5);
  });

  it('rejeita saldo negativo e identificador inválido de variação', async () => {
    const dto = plainToInstance(CriarProdutoVendaDto, {
      name: 'CAMISA',
      price: 100,
      category: 'ROUPAS',
      brand: 'MARCA',
      variants: [{ id: 'outra-variacao', name: 'P', stock: -1 }],
    });
    expect(
      (await validate(dto)).some((error) => error.property === 'variants'),
    ).toBe(true);
  });
});
