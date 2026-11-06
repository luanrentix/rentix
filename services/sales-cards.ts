import { apiFetch } from "./api";

export type CardAdministrator = { id: string; name: string };
export type SalesCardPayment = {
  method: "CARTAO_CREDITO" | "CARTAO_DEBITO";
  administratorId: string;
  administratorName?: string;
  brand: string;
  lastFour?: string;
  holderName?: string;
  nsu: string;
  authorizationCode?: string;
  installments: number;
  amount: number;
};
export const listCardAdministrators = () =>
  apiFetch<CardAdministrator[]>("/vendas/cartoes/administradoras", {
    skipCache: true,
  });
export const createCardAdministrator = (name: string) =>
  apiFetch<CardAdministrator>("/vendas/cartoes/administradoras", {
    method: "POST",
    body: JSON.stringify({ name }),
  });
