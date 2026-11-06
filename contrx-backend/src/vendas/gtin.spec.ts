import { PrismaService } from '../prisma/prisma.service';
import { Prisma } from '@prisma/client';
import { gtinAliases, isValidGtin } from './gtin';
import { VendasService } from './vendas.service';

describe('GTIN de produtos', () => {
  it.each(['96385074', '036000291452', '4006381333931', '00036000291452'])(
    'aceita formato e verificador: %s',
    (code) => {
      expect(isValidGtin(code)).toBe(true);
    },
  );
  it.each([
    '',
    '123',
    '00000000',
    '4006381333932',
    'ABC6381333931',
    '40063813339310',
  ])('rejeita GTIN invalido: %s', (code) => {
    expect(isValidGtin(code)).toBe(false);
  });
  it('reconhece as representacoes equivalentes com zeros a esquerda', () => {
    expect(gtinAliases('036000291452')).toEqual([
      '036000291452',
      '0036000291452',
      '00036000291452',
    ]);
    expect(gtinAliases('4006381333931')).not.toContain('006381333931');
  });
  function fixture() {
    const db = {
      salesProduct: { findFirst: jest.fn().mockResolvedValue(null) },
      salesProductVariant: { findFirst: jest.fn().mockResolvedValue(null) },
    };
    return { db, service: new VendasService(db as unknown as PrismaService) };
  }
  it('consulta apenas a empresa autenticada, exclui o proprio produto e inclui inativos', async () => {
    const { db, service } = fixture();
    expect(
      (
        await service.checkProductGtin(
          'empresa-A',
          '036000291452',
          'produto-editado',
        )
      ).available,
    ).toBe(true);
    expect(db.salesProduct.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: 'empresa-A',
        barcode: { in: gtinAliases('036000291452') },
        id: { not: 'produto-editado' },
      },
      select: { name: true },
    });
    expect(db.salesProductVariant.findFirst).toHaveBeenCalledWith({
      where: {
        companyId: 'empresa-A',
        barcode: { in: gtinAliases('036000291452') },
      },
      select: { name: true },
    });
  });
  it('avisa quando outro produto ja usa o GTIN', async () => {
    const { db, service } = fixture();
    db.salesProduct.findFirst.mockResolvedValue({ name: 'CAMISA' });
    const result = await service.checkProductGtin('empresa-A', '4006381333931');
    expect(result.available).toBe(false);
    expect(result.message).toContain('CAMISA');
  });
  it('bloqueia GTIN existente em variacao', async () => {
    const { db, service } = fixture();
    db.salesProductVariant.findFirst.mockResolvedValue({ name: 'TAMANHO M' });
    expect(
      (await service.checkProductGtin('empresa-A', '96385074')).available,
    ).toBe(false);
  });
  it('nao consulta o banco quando o digito verificador e invalido', async () => {
    const { db, service } = fixture();
    expect(
      (await service.checkProductGtin('empresa-A', '4006381333932')).valid,
    ).toBe(false);
    expect(db.salesProduct.findFirst).not.toHaveBeenCalled();
  });
  it('impede gravacao com GTIN invalido mesmo sem a validacao da tela', async () => {
    const { db, service } = fixture();
    await expect(
      service['assertBarcodeAvailable'](
        db as unknown as Prisma.TransactionClient,
        'empresa-A',
        '4006381333932',
        'novo',
      ),
    ).rejects.toThrow('GTIN inválido');
    expect(db.salesProduct.findFirst).not.toHaveBeenCalled();
  });
  it('impede gravacao quando outro cadastro usou o GTIN apos a consulta da tela', async () => {
    const { db, service } = fixture();
    db.salesProduct.findFirst.mockResolvedValue({ name: 'OUTRO PRODUTO' });
    await expect(
      service['assertBarcodeAvailable'](
        db as unknown as Prisma.TransactionClient,
        'empresa-A',
        '4006381333931',
        'novo',
      ),
    ).rejects.toThrow('já utilizado');
  });
  it('mantem o GTIN opcional para produtos sem codigo de barras', async () => {
    const { db, service } = fixture();
    await expect(
      service['assertBarcodeAvailable'](
        db as unknown as Prisma.TransactionClient,
        'empresa-A',
        '',
        'novo',
      ),
    ).resolves.toBeUndefined();
  });
});
