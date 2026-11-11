import type { SalesProduct } from "./vendas.service";
export type SalesPriceType = "NORMAL" | "PROMOCIONAL";
export function getSalesPriceOptions(
  product: SalesProduct,
  variantId?: string,
) {
  const variant = product.variants?.find((item) => item.id === variantId);
  const individual = !product.inheritGridPrice && variant?.price != null;
  const normal = Number(individual ? variant!.price : product.price);
  const promotion = Number(product.promotionalPrice);
  return {
    normal,
    promotional:
      !individual && promotion > 0 && promotion < normal ? promotion : null,
  };
}
export function adjustedUnitPrice(
  base: number,
  discount: number,
  addition: number,
) {
  return (
    (Math.round(base * 100) -
      Math.round(discount * 100) +
      Math.round(addition * 100)) /
    100
  );
}
