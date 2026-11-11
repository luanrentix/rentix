import { Prisma } from '@prisma/client';
import { resolveSalesItemPrice } from './item-pricing';
const d = (value: number) => new Prisma.Decimal(value);
const product = {
  name: 'CAMISA',
  price: d(100),
  promotionalPrice: d(80),
  inheritGridPrice: true,
  allowDiscount: true,
  allowAddition: true,
};
const item = { productId: 'p', quantity: 1 };
describe('Preço normal, promoção e ajustes unitários', () => {
  it('permite escolher normal e promocional e registra o preço original', () => {
    const regular = resolveSalesItemPrice(product, undefined, {
      ...item,
      priceType: 'NORMAL',
      unitPrice: 100,
    });
    const promotion = resolveSalesItemPrice(product, undefined, {
      ...item,
      priceType: 'PROMOCIONAL',
      unitPrice: 80,
    });
    expect(regular.unitPrice.toNumber()).toBe(100);
    expect(promotion.unitPrice.toNumber()).toBe(80);
    expect(promotion.originalUnitPrice).toBe('100');
    expect(promotion.priceType).toBe('PROMOCIONAL');
  });
  it('bloqueia desconto sobre promoção explícita e por payload legado', () => {
    expect(() =>
      resolveSalesItemPrice(product, undefined, {
        ...item,
        priceType: 'PROMOCIONAL',
        discount: 1,
        unitPrice: 79,
      }),
    ).toThrow('não podem receber desconto');
    expect(() =>
      resolveSalesItemPrice(product, undefined, { ...item, unitPrice: 79 }),
    ).toThrow('não podem receber desconto');
    expect(() =>
      resolveSalesItemPrice(product, undefined, {
        ...item,
        priceType: 'PROMOCIONAL',
        unitPrice: 70,
      }),
    ).toThrow('preço do produto mudou');
  });
  it('aplica desconto e acréscimo por unidade no preço normal', () => {
    const result = resolveSalesItemPrice(product, undefined, {
      ...item,
      priceType: 'NORMAL',
      discount: 10,
      addition: 2,
      unitPrice: 92,
    });
    expect(result.unitPrice.toNumber()).toBe(92);
    expect(result.discount).toBe('10');
    expect(result.addition).toBe('2');
  });
  it('preserva bloqueios por produto e limite do ajuste', () => {
    expect(() =>
      resolveSalesItemPrice({ ...product, allowDiscount: false }, undefined, {
        ...item,
        priceType: 'NORMAL',
        discount: 5,
      }),
    ).toThrow('não permite desconto');
    expect(() =>
      resolveSalesItemPrice({ ...product, allowAddition: false }, undefined, {
        ...item,
        priceType: 'PROMOCIONAL',
        addition: 5,
      }),
    ).toThrow('não permite acréscimo');
    expect(() =>
      resolveSalesItemPrice(product, undefined, {
        ...item,
        priceType: 'NORMAL',
        discount: 101,
      }),
    ).toThrow('Confira o desconto');
  });
  it('não inventa promoção para variação de preço independente', () => {
    const p = { ...product, inheritGridPrice: false };
    expect(
      resolveSalesItemPrice(
        p,
        { price: d(120) },
        { ...item, priceType: 'NORMAL' },
      ).unitPrice.toNumber(),
    ).toBe(120);
    expect(() =>
      resolveSalesItemPrice(
        p,
        { price: d(120) },
        { ...item, priceType: 'PROMOCIONAL' },
      ),
    ).toThrow('não possui preço promocional');
  });
});
