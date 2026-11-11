import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import type { VariacaoProdutoVendaDto } from './dto/criar-produto-venda.dto';

export const productCatalogInclude = {
  supplier: { select: { name: true } },
  variants: { where: { active: true }, orderBy: { name: 'asc' as const } },
  gridChildren: {
    where: { active: true },
    orderBy: { gridValue: 'asc' as const },
  },
  parentProduct: { select: { name: true } },
} satisfies Prisma.SalesProductInclude;

export function formatCatalogProduct(
  product: Prisma.SalesProductGetPayload<{
    include: typeof productCatalogInclude;
  }>,
) {
  const { supplier, gridChildren, parentProduct, priceComposition, ...result } =
    product;
  void priceComposition;
  if (!product.isGridParent)
    return {
      ...result,
      gridParentName: parentProduct?.name ?? null,
      supplierName: supplier?.name ?? product.supplierName,
    };
  return {
    ...result,
    stock: gridChildren.reduce(
      (sum, child) => sum.add(child.stock),
      new Prisma.Decimal(0),
    ),
    reservedStock: gridChildren.reduce(
      (sum, child) => sum.add(child.reservedStock),
      new Prisma.Decimal(0),
    ),
    supplierName: supplier?.name ?? product.supplierName,
    gridParentName: null,
    variations: gridChildren.map((child) => child.gridValue).join(', ') || null,
    variants: gridChildren.map((child) => ({
      id: child.id,
      name: child.gridValue!,
      sku: child.sku,
      barcode: child.barcode,
      price: child.price,
      stock: child.stock,
      reservedStock: child.reservedStock,
      expectedUpdatedAt: child.updatedAt.toISOString(),
    })),
  };
}

export async function syncGridProducts(
  tx: Prisma.TransactionClient,
  companyId: string,
  parent: Prisma.SalesProductGetPayload<Record<string, never>>,
  inputs: VariacaoProdutoVendaDto[] | undefined,
  assertBarcode: (barcode: string | undefined, id: string) => Promise<void>,
) {
  if (inputs === undefined) return;
  const existing = await tx.salesProduct.findMany({
    where: { companyId, parentProductId: parent.id },
  });
  const names = inputs.map((input) =>
    input.name.trim().toLocaleUpperCase('pt-BR'),
  );
  if (names.some((name) => !name) || new Set(names).size !== names.length)
    throw new BadRequestException(
      'As opções da grade devem ser preenchidas e únicas.',
    );
  const codes = await tx.salesProduct.findMany({
    where: { companyId },
    select: { id: true, sku: true },
  });
  const kept = new Set<string>();
  for (const [index, input] of inputs.entries()) {
    const name = names[index];
    const previous = input.id
      ? existing.find((child) => child.id === input.id)
      : existing.find((child) => child.gridValue === name);
    if (input.id && !previous)
      throw new BadRequestException(
        'O produto da grade não pertence a esta empresa ou matriz.',
      );
    if (
      previous?.active &&
      (!input.expectedUpdatedAt ||
        previous.updatedAt.getTime() !==
          new Date(input.expectedUpdatedAt).getTime())
    )
      throw new BadRequestException(
        'Um produto da grade foi atualizado. Reabra a matriz para preservar o estoque atual.',
      );
    if (previous?.reservedStock.gt(input.stock))
      throw new BadRequestException(
        'O estoque não pode ficar abaixo da reserva em condicional.',
      );
    const id = previous?.id || randomUUID();
    const sku = `${parent.sku?.trim() || ''}-${name}`;
    if (!parent.sku?.trim() || sku.length > 40)
      throw new BadRequestException(
        'O código da matriz e a opção da grade devem formar um código de até 40 caracteres.',
      );
    if (codes.some((code) => code.sku === sku && code.id !== id))
      throw new BadRequestException(
        `O código ${sku} já está cadastrado nesta empresa.`,
      );
    const restoring = previous && !previous.active && !input.id;
    const barcode = restoring
      ? previous.barcode
      : input.barcode?.trim() || null;
    await assertBarcode(barcode || undefined, id);
    const price = parent.inheritGridPrice
      ? parent.price
      : new Prisma.Decimal(input.price ?? previous?.price ?? parent.price);
    const promotionalPrice =
      parent.promotionalPrice && parent.promotionalPrice.lte(price)
        ? parent.promotionalPrice
        : null;
    const stock = restoring ? previous.stock : new Prisma.Decimal(input.stock);
    if (previous) {
      await tx.salesProduct.update({
        where: { id },
        data: {
          sku,
          gridValue: name,
          gridId: parent.gridId,
          stock,
          price,
          promotionalPrice,
          barcode,
          active: true,
          manageStock: true,
        },
      });
    } else {
      await tx.salesProduct.create({
        data: {
          id,
          companyId,
          parentProductId: parent.id,
          gridValue: name,
          gridId: parent.gridId,
          name: `${parent.name.slice(0, 117 - name.length)} - ${name}`,
          sku,
          price,
          promotionalPrice,
          stock,
          manageStock: true,
          barcode,
          allowDiscount: parent.allowDiscount,
          allowAddition: parent.allowAddition,
          purchaseCost: parent.purchaseCost,
          additionalCost: parent.additionalCost,
          markupMultiplier: parent.markupMultiplier,
          reference: parent.reference,
          factoryCode: parent.factoryCode,
          unit: parent.unit,
          kind: parent.kind,
          description: parent.description,
          showInSale: parent.showInSale,
          category: parent.category,
          brand: parent.brand,
          productType: parent.productType,
          supplierId: parent.supplierId,
          supplierName: parent.supplierName,
          minimumStock: parent.minimumStock,
          commission: parent.commission,
          commissionEnabled: parent.commissionEnabled,
          commissionType: parent.commissionType,
          commissionRule: parent.commissionRule,
          active: parent.active,
        },
      });
    }
    kept.add(id);
    const delta = stock.sub(previous?.stock ?? 0);
    if (!delta.eq(0))
      await tx.salesStockMovement.create({
        data: {
          companyId,
          productId: id,
          stockChange: delta,
          reservedChange: 0,
          reason: previous
            ? 'AJUSTE MANUAL NO CADASTRO'
            : 'ESTOQUE INICIAL DO CADASTRO',
        },
      });
  }
  const removed = existing.filter(
    (child) => child.active && !kept.has(child.id),
  );
  if (removed.some((child) => child.reservedStock.gt(0)))
    throw new BadRequestException(
      'Não é possível remover produto da grade com reserva em condicional.',
    );
  await tx.salesProduct.updateMany({
    where: {
      companyId,
      parentProductId: parent.id,
      id: { in: removed.map((child) => child.id) },
    },
    data: { active: false, showInSale: false },
  });
}
