import type { Prisma } from '@prisma/client';

export function orderOrigin(
  order: {
    saleType: string;
    status: string;
    items: Prisma.JsonValue;
    stockReserved: boolean;
  },
  events: { details: Prisma.JsonValue }[],
) {
  const history = [...events]
    .reverse()
    .map((event) => event.details as Prisma.JsonObject);
  const historicOrigin = history
    .map((event) => event.saleType)
    .find(
      (type): type is string =>
        typeof type === 'string' &&
        ['ORCAMENTO', 'PEDIDO', 'CONDICIONAL'].includes(type),
    );
  const originType =
    historicOrigin ??
    (history.some((event) => event.stockReserved === true)
      ? 'CONDICIONAL'
      : order.saleType);
  if (originType !== 'CONDICIONAL') return { originType };
  const quantities = (items: Prisma.JsonValue | undefined) => {
    const result = new Map<string, number>();
    if (Array.isArray(items))
      for (const item of items as Prisma.JsonObject[]) {
        if (typeof item.productId !== 'string') continue;
        const key = `${item.productId}:${typeof item.variantId === 'string' ? item.variantId : ''}`;
        result.set(key, (result.get(key) || 0) + Number(item.quantity || 0));
      }
    return result;
  };
  let previous = new Map<string, number>();
  let sent = 0;
  let returned = 0;
  for (const event of history.filter((event) => event.stockReserved === true)) {
    const current = quantities(event.items);
    for (const key of new Set([...previous.keys(), ...current.keys()])) {
      const delta = (current.get(key) || 0) - (previous.get(key) || 0);
      if (delta > 0) sent += delta;
      else returned -= delta;
    }
    previous = current;
  }
  let sold = 0;
  let pending = 0;
  const current = quantities(order.items);
  for (const [key, amount] of previous) {
    if (order.stockReserved) pending += amount;
    else if (order.saleType === 'VENDA' && order.status === 'CONCLUIDA') {
      const retained = Math.min(amount, current.get(key) || 0);
      sold += retained;
      returned += amount - retained;
    } else returned += amount;
  }
  const rounded = (value: number) => Number(value.toFixed(3));
  return {
    originType,
    conditionalSummary: {
      sent: rounded(sent),
      returned: rounded(returned),
      sold: rounded(sold),
      pending: rounded(pending),
    },
  };
}
