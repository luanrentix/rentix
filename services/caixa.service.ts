import { apiFetch } from "./api";

export const prepareSalesCashAccount = () =>
  apiFetch<{ id: string }>("/vendas/caixa/conta", {
    method: "POST",
    body: "{}",
  });

export type CashMovement = {
  id: string;
  date: string;
  direction: string;
  amount: number;
  method: string;
  kind: string;
  description: string;
  accountId: string;
  accountName: string;
  orderNumber: number | null;
  customer: string | null;
  operator: string | null;
};
export type CashData = {
  accounts: {
    id: string;
    name: string;
    type: string;
    active: boolean;
    balance: number;
    cashBalance: number | null;
  }[];
  movements: CashMovement[];
  methods: Record<string, { incoming: number; outgoing: number; net: number }>;
};
export const getCash = (start: string, end: string) =>
  apiFetch<CashData>(`/vendas/caixa?${new URLSearchParams({ start, end })}`, {
    skipCache: true,
  });
export const createCashOperation = (body: {
  requestId: string;
  accountId?: string;
  direction: "IN" | "OUT";
  amount: number;
  reason: string;
}) => apiFetch("/vendas/caixa", { method: "POST", body: JSON.stringify(body) });
