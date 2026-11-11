import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { ItemVendaDto } from './dto/criar-venda.dto';

export function resolveSalesItemPrice(
  product: {
    name: string;
    price: Prisma.Decimal;
    promotionalPrice: Prisma.Decimal | null;
    inheritGridPrice: boolean;
    allowDiscount?: boolean;
    allowAddition?: boolean;
  },
  variant: { price: Prisma.Decimal | null } | undefined,
  item: ItemVendaDto,
) {
  const individual = !product.inheritGridPrice && variant?.price != null;
  const normal =
    !product.inheritGridPrice && variant?.price != null
      ? variant.price
      : product.price;
  const promotion =
    !individual &&
    product.promotionalPrice?.gt(0) &&
    product.promotionalPrice.lt(normal)
      ? product.promotionalPrice
      : null;
  const supplied =
    item.unitPrice === undefined ? null : new Prisma.Decimal(item.unitPrice);
  const priceType =
    item.priceType ??
    (promotion && (!supplied || supplied.lte(promotion))
      ? 'PROMOCIONAL'
      : 'NORMAL');
  if (priceType === 'PROMOCIONAL' && !promotion)
    throw new BadRequestException(
      'Este produto não possui preço promocional disponível. Selecione o preço normal.',
    );
  const base = priceType === 'PROMOCIONAL' ? promotion! : normal;
  let discount = new Prisma.Decimal(item.discount ?? 0);
  let addition = new Prisma.Decimal(item.addition ?? 0);
  let finalPrice: Prisma.Decimal;
  if (item.priceType) {
    finalPrice = base.sub(discount).add(addition);
    if (supplied && !supplied.eq(finalPrice))
      throw new BadRequestException(
        'O preço do produto mudou. Confira o preço selecionado e os ajustes por item.',
      );
  } else {
    finalPrice = supplied ?? base;
    discount = Prisma.Decimal.max(0, base.sub(finalPrice));
    addition = Prisma.Decimal.max(0, finalPrice.sub(base));
  }
  if (discount.lt(0) || addition.lt(0) || discount.gt(base) || finalPrice.lt(0))
    throw new BadRequestException(
      'Confira o desconto e o acréscimo do produto.',
    );
  if (priceType === 'PROMOCIONAL' && discount.gt(0))
    throw new BadRequestException(
      'Produtos com preço promocional não podem receber desconto adicional.',
    );
  if (product.allowDiscount === false && discount.gt(0))
    throw new BadRequestException(`${product.name} não permite desconto.`);
  if (product.allowAddition === false && addition.gt(0))
    throw new BadRequestException(`${product.name} não permite acréscimo.`);
  return {
    priceType,
    originalUnitPrice: normal.toString(),
    baseUnitPrice: base.toString(),
    discount: discount.toString(),
    addition: addition.toString(),
    unitPrice: finalPrice,
  };
}
