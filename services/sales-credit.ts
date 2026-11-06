import { apiFetch } from "./api";
export type CreditEntry = {
  id: string;
  amount: string;
  reason: string;
  orderId?: string | null;
  actorId?: string;
  actor?: { name: string };
  createdAt: string;
  reversedAt?: string | null;
};
export type CreditCustomer = {
  id: string;
  name: string;
  active: boolean;
  balance: string;
  entries: CreditEntry[];
  adjustments: CreditEntry[];
};
export type Refund = {
  id: string;
  orderId: string;
  order: { number: number; customerName: string; paymentMethod: string };
  transaction: { type: string; bankAccount: { name: string } };
  amount: string;
  settledAmount: string;
  reason: string;
  createdAt: string;
  settlements: {
    id: string;
    amount: string;
    disposition: string;
    reason: string;
    actorId: string;
    actor: { name: string };
    createdAt: string;
  }[];
};
export const getCustomerCredits = () =>
  apiFetch<CreditCustomer[]>("/vendas/creditos", { skipCache: true });
export const adjustCustomerCredit = (data: {
  requestId: string;
  customerId: string;
  direction: "ADD" | "DEDUCT";
  amount: number;
  reason: string;
}) =>
  apiFetch<CreditEntry>("/vendas/creditos", {
    method: "POST",
    body: JSON.stringify(data),
  });
export const getSalesRefunds = () =>
  apiFetch<Refund[]>("/vendas/reembolsos", { skipCache: true });
export const settleSalesRefund = (
  id: string,
  data: {
    requestId: string;
    disposition: "REFUND" | "CREDIT";
    amount: number;
    reason: string;
  },
) =>
  apiFetch(`/vendas/reembolsos/${encodeURIComponent(id)}/confirmar`, {
    method: "POST",
    body: JSON.stringify(data),
  });
