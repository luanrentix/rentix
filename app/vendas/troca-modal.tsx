"use client";

import CardPaymentModal from "./card-payment-modal";
import type { SalesCardPayment } from "@/services/sales-cards";
import { useEffect, useState } from "react";
import {
  validateSalePayment,
  paymentAmount,
  type SalePaymentMethod,
} from "@/services/sales-payment";
import {
  getSalesReturnInfo,
  getSalesCustomerCredit,
  type SalesCustomer,
  type SalesOrder,
  type SalesReceivingAccount,
  type SalesReturnInfo,
} from "@/services/vendas.service";

export type SalesReturnDecision = {
  refundConfirmed?: boolean;
  cardPayments?: SalesCardPayment[];
  originalOrderId: string;
  customer: SalesCustomer;
  returnedItems: { itemIndex: number; quantity: number }[];
  returnDisposition?: "REFUND" | "CREDIT";
  paymentMethod: string;
  paymentDetails?: Record<string, number>;
  bankAccountId?: string;
  installments: number;
  difference: number;
};
const methods = [
  ["DINHEIRO", "Dinheiro"],
  ["PIX", "Pix"],
  ["CARTAO_DEBITO", "Débito"],
  ["CARTAO_CREDITO", "Crédito"],
  ["CREDIARIO", "Crediário"],
  ["SALDO_CLIENTE", "Crédito da loja"],
] as const;
const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const field =
  "w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 px-3 py-2 text-sm";

export default function SalesReturnModal({
  orders,
  merchandiseTotal,
  accounts,
  saving,
  error: externalError,
  onClose,
  onConfirm,
}: {
  orders: SalesOrder[];
  merchandiseTotal: number;
  accounts: SalesReceivingAccount[];
  saving: boolean;
  error: string;
  onClose: () => void;
  onConfirm: (decision: SalesReturnDecision) => Promise<void>;
}) {
  const [originalId, setOriginalId] = useState("");
  const [info, setInfo] = useState<SalesReturnInfo | null>(null);
  const [quantities, setQuantities] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [disposition, setDisposition] = useState<"REFUND" | "CREDIT">("REFUND");
  const [refundConfirmed, setRefundConfirmed] = useState(false);
  const [method, setMethod] = useState("DINHEIRO");
  const [cardPayments, setCardPayments] = useState<SalesCardPayment[]>([]);
  const [cardModal, setCardModal] = useState<SalesCardPayment["method"] | null>(
    null,
  );
  const [parts, setParts] = useState<Record<string, string>>({});
  const [accountId, setAccountId] = useState("");
  const [installments, setInstallments] = useState(1);
  useEffect(() => {
    let current = true;
    setInfo(null);
    setRefundConfirmed(false);
    setQuantities({});
    setError("");
    setMethod("DINHEIRO");
    setCardPayments([]);
    if (!originalId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    void getSalesReturnInfo(originalId)
      .then((result) => {
        if (current) setInfo(result);
      })
      .catch((cause) => {
        if (current)
          setError(
            cause instanceof Error
              ? cause.message
              : "Não foi possível abrir a venda original.",
          );
      })
      .finally(() => {
        if (current) setLoading(false);
      });
    return () => {
      current = false;
    };
  }, [originalId]);
  const number = (value: string | undefined) => paymentAmount(value || "0");
  const returned =
    info?.items
      .filter((item) => number(quantities[item.itemIndex]) > 0)
      .map((item) => ({
        itemIndex: item.itemIndex,
        quantity: number(quantities[item.itemIndex]),
      })) ?? [];
  const returnValue = Math.min(
    Number(info?.remainingReturnValue || 0),
    Math.round(
      (info?.items.reduce(
        (sum, item) =>
          sum + number(quantities[item.itemIndex]) * item.unitReturnValue,
        0,
      ) || 0) * 100,
    ) / 100,
  );
  const debtOffset = Math.min(returnValue, Number(info?.outstanding || 0));
  const difference =
    Math.round((merchandiseTotal - returnValue + debtOffset) * 100) / 100;
  const creditPart =
    method === "CREDIARIO"
      ? difference
      : method === "MISTO"
        ? number(parts.CREDIARIO)
        : 0;
  const shopCredit =
    method === "SALDO_CLIENTE"
      ? difference
      : method === "MISTO"
        ? number(parts.SALDO_CLIENTE)
        : 0;
  const requiresAccount =
    difference > 0
      ? difference - creditPart - shopCredit > 0
      : difference < 0 && disposition === "REFUND";
  const requiredCards = (["CARTAO_DEBITO", "CARTAO_CREDITO"] as const).filter(
    (key) =>
      (difference > 0 || (difference < 0 && disposition === "REFUND")) &&
      (method === key || (method === "MISTO" && number(parts[key]) > 0)),
  );
  const cardAmount = (key: SalesCardPayment["method"]) =>
    method === "MISTO" ? number(parts[key]) : Math.abs(difference);
  function chooseMethod(value: string) {
    setMethod(value);
    if (value === "CARTAO_DEBITO" || value === "CARTAO_CREDITO")
      setCardModal(value);
  }
  async function confirm() {
    setError("");
    if (difference < 0 && disposition === "REFUND" && !refundConfirmed) { setError("Confirme que a devolução financeira já foi efetivada, ou escolha crédito para o cliente."); return; }
    if (!info || !returned.length) {
      setError("Selecione a venda e pelo menos um item devolvido.");
      return;
    }
    if (
      info.items.some(
        (item) =>
          !Number.isFinite(number(quantities[item.itemIndex])) ||
          number(quantities[item.itemIndex]) < 0 ||
          number(quantities[item.itemIndex]) > item.available,
      )
    ) {
      setError("Confira as quantidades devolvidas e os saldos disponíveis.");
      return;
    }
    if (difference < 0 && disposition === "CREDIT" && info.customer.isSystem) {
      setError(
        "Consumidor final não pode acumular crédito. Escolha reembolso.",
      );
      return;
    }
    const paymentDetails = Object.fromEntries(
      methods.map(([key]) => [key, number(parts[key])]),
    );
    if (
      difference > 0 &&
      method === "MISTO" &&
      (Object.values(paymentDetails).some(
        (value) => !Number.isFinite(value) || value < 0,
      ) ||
        Math.round(
          Object.values(paymentDetails).reduce((sum, value) => sum + value, 0) *
            100,
        ) !== Math.round(difference * 100))
    ) {
      setError("A soma das formas de pagamento deve corresponder à diferença.");
      return;
    }
    if (difference > 0) {
      let balance = 0;
      if (shopCredit > 0) {
        try {
          balance = Number(
            (await getSalesCustomerCredit(info.customer.id)).balance,
          );
        } catch {
          setError(
            "Não foi possível consultar o crédito do cliente. Tente novamente.",
          );
          return;
        }
      }
      const normalizedMethod = (
        method === "CARTAO_DEBITO"
          ? "DEBITO"
          : method === "CARTAO_CREDITO"
            ? "CREDITO"
            : method
      ) as SalePaymentMethod;
      const paymentError = validateSalePayment({
        method: normalizedMethod,
        parts: {
          DINHEIRO: parts.DINHEIRO || "0",
          PIX: parts.PIX || "0",
          DEBITO: parts.CARTAO_DEBITO || "0",
          CREDITO: parts.CARTAO_CREDITO || "0",
          CREDIARIO: parts.CREDIARIO || "0",
          SALDO_CLIENTE: parts.SALDO_CLIENTE || "0",
        },
        total: difference,
        accountId,
        accounts,
        customer: info.customer,
        creditBalance: balance,
        installments,
        tender: "",
      });
      if (paymentError) {
        setError(paymentError);
        return;
      }
    }
    if (requiresAccount && !accountId) {
      setError("Selecione a conta ou caixa.");
      return;
    }
    const missingCard = requiredCards.find(
      (key) =>
        !cardPayments.some(
          (row) =>
            row.method === key &&
            Math.round(row.amount * 100) === Math.round(cardAmount(key) * 100),
        ),
    );
    if (missingCard) {
      setCardModal(missingCard);
      return;
    }
    await onConfirm({
      cardPayments: cardPayments
        .filter((row) => requiredCards.includes(row.method))
        .map(({ administratorName, ...card }) => card),
      originalOrderId: originalId,
      customer: info.customer,
      returnedItems: returned,
      returnDisposition: difference < 0 ? disposition : undefined,
      refundConfirmed,
      paymentMethod: method,
      paymentDetails:
        difference > 0 && method === "MISTO" ? paymentDetails : undefined,
      bankAccountId: accountId || undefined,
      installments,
      difference,
    });
  }
  return (
    <>
      <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/50 p-3">
        <section
          role="dialog"
          aria-modal="true"
          aria-label="Troca e devolução"
          className="max-h-[92vh] w-full max-w-3xl overflow-auto rounded-2xl bg-white dark:bg-slate-900 p-5 shadow-xl"
        >
          <header className="flex justify-between gap-3">
            <div>
              <h2 className="text-xl font-black">Troca / devolução</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Os novos produtos são os itens adicionados no caixa. Para
                somente devolver, deixe o carrinho vazio.
              </p>
            </div>
            <button type="button" disabled={saving} onClick={onClose}>
              Fechar
            </button>
          </header>
          {(error || externalError) && (
            <p
              role="alert"
              className="mt-3 rounded-xl bg-red-50 p-3 text-sm text-red-700"
            >
              {error || externalError}
            </p>
          )}
          <label className="mt-4 block space-y-1 text-sm font-bold">
            Venda original
            <select
              className={field}
              value={originalId}
              disabled={saving}
              onChange={(event) => setOriginalId(event.target.value)}
            >
              <option value="">Selecione</option>
              {orders
                .filter(
                  (order) =>
                    order.status === "CONCLUIDA" &&
                    ["VENDA", "TROCA"].includes(order.saleType) &&
                    order.items.length,
                )
                .map((order) => (
                  <option key={order.id} value={order.id}>
                    #{order.number} · {order.customerName} ·{" "}
                    {new Date(order.createdAt).toLocaleDateString("pt-BR")}
                  </option>
                ))}
            </select>
          </label>
          {loading && (
            <p className="py-4 text-sm">
              Carregando itens e devoluções anteriores...
            </p>
          )}
          {info && (
            <>
              <p className="mt-3 text-sm font-bold">
                Cliente: {info.customer.name}
              </p>
              <div className="mt-3 divide-y rounded-xl border">
                {info.items.map((item) => (
                  <label
                    key={item.itemIndex}
                    className="flex items-center justify-between gap-3 p-3 text-sm"
                  >
                    <span>
                      {item.name}
                      {item.variantName && (
                        <small className="block">{item.variantName}</small>
                      )}
                      <small className="block text-slate-500 dark:text-slate-400">
                        Saldo para devolver:{" "}
                        {item.available.toLocaleString("pt-BR")} · Valor
                        unitário líquido: {money(item.unitReturnValue)}
                      </small>
                    </span>
                    <input
                      aria-label={`Devolver ${item.name} ${item.variantName || ""}`}
                      disabled={saving || item.available <= 0}
                      type="number"
                      min="0"
                      max={item.available}
                      step="0.001"
                      className={`${field} max-w-28`}
                      value={quantities[item.itemIndex] || ""}
                      placeholder="0"
                      onChange={(event) =>
                        setQuantities((current) => ({
                          ...current,
                          [item.itemIndex]: event.target.value,
                        }))
                      }
                    />
                  </label>
                ))}
              </div>
              <div className="mt-4 space-y-1 rounded-xl bg-slate-50/75 dark:bg-slate-800/50 p-3 text-sm">
                <p>
                  Produtos novos: <strong>{money(merchandiseTotal)}</strong>
                </p>
                <p>
                  Valor devolvido: <strong>{money(returnValue)}</strong>
                </p>
                {debtOffset > 0 && (
                  <p className="text-amber-800">
                    Abatimento de parcelas em aberto da venda original:{" "}
                    <strong>{money(debtOffset)}</strong>. Somente o saldo já
                    pago pode ser reembolsado ou convertido em crédito.
                  </p>
                )}
                <p className="text-lg font-black">
                  {difference > 0
                    ? "Diferença a pagar"
                    : difference < 0
                      ? "Saldo para o cliente"
                      : "Sem diferença"}
                  : {money(Math.abs(difference))}
                </p>
              </div>
              {difference < 0 && (
                <fieldset className="mt-4 space-y-2">
                  <legend className="text-sm font-black">
                    O que deseja fazer com a diferença?
                  </legend>
                  <label className="mr-5 inline-flex gap-2 text-sm">
                    <input
                      type="radio"
                      checked={disposition === "REFUND"}
                      onChange={() => setDisposition("REFUND")}
                    />
                    Devolver a diferença
                  </label>
                  <label className="inline-flex gap-2 text-sm">
                    <input
                      type="radio"
                      disabled={info.customer.isSystem}
                      checked={disposition === "CREDIT"}
                      onChange={() => setDisposition("CREDIT")}
                    />
                    Lançar como crédito do cliente
                  </label>
                </fieldset>
              )}
              {difference > 0 && (
                <label className="mt-4 block space-y-1 text-sm font-bold">
                  Pagamento da diferença
                  <select
                    className={field}
                    value={method}
                    onChange={(event) => chooseMethod(event.target.value)}
                  >
                    {methods.map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                    <option value="MISTO">Misto</option>
                  </select>
                </label>
              )}
              {difference > 0 && method === "MISTO" && (
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {methods.map(([key, label]) => (
                    <label key={key} className="text-xs font-bold">
                      {label}
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        className={field}
                        value={parts[key] || ""}
                        onChange={(event) =>
                          setParts((current) => ({
                            ...current,
                            [key]: event.target.value,
                          }))
                        }
                      />
                    </label>
                  ))}
                </div>
              )}
              {creditPart > 0 && (
                <label className="mt-3 block text-sm font-bold">
                  Parcelas do crediário
                  <input
                    className={field}
                    type="number"
                    min="1"
                    max="60"
                    value={installments}
                    onChange={(event) =>
                      setInstallments(Number(event.target.value))
                    }
                  />
                </label>
              )}
              {difference < 0 && disposition === "REFUND" && (
                <label className="mt-3 block space-y-1 text-sm font-bold">
                  Forma do reembolso
                  <select
                    className={field}
                    value={method}
                    onChange={(event) => setMethod(event.target.value)}
                  >
                    {methods.slice(0, 4).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {requiresAccount && (
                <label className="mt-3 block space-y-1 text-sm font-bold">
                  {difference < 0
                    ? "Conta / caixa do reembolso"
                    : "Conta / caixa de recebimento"}
                  <select
                    className={field}
                    value={accountId}
                    onChange={(event) => setAccountId(event.target.value)}
                  >
                    <option value="">Selecione</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
            </>
          )}
          <footer className="mt-5 flex justify-end gap-3">
            {difference < 0 && disposition === "REFUND" && <label className="text-sm"><input type="checkbox" checked={refundConfirmed} onChange={(event) => setRefundConfirmed(event.target.checked)} disabled={saving}/> Confirmo que o dinheiro, Pix ou cartão já foi efetivamente devolvido.</label>}
            <button
              type="button"
              disabled={saving}
              onClick={onClose}
              className="rounded-xl border px-4 py-2"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={saving || !info || !returned.length}
              onClick={() => void confirm()}
              className="rounded-2xl bg-[var(--primary-color)] px-5 py-2 font-black text-white disabled:opacity-40 shadow-lg shadow-[var(--primary-bg-light)] transition hover:bg-[var(--primary-hover)] active:scale-95"
            >
              {saving ? "Gravando..." : "Confirmar troca / devolução"}
            </button>
          </footer>
        </section>
      </div>
      {cardModal && (
        <CardPaymentModal
          key={cardModal}
          method={cardModal}
          amount={cardAmount(cardModal)}
          initial={cardPayments.find((row) => row.method === cardModal)}
          onClose={() => setCardModal(null)}
          onSave={(card) => {
            setCardPayments((current) => [
              ...current.filter((row) => row.method !== card.method),
              card,
            ]);
            setCardModal(null);
          }}
        />
      )}
    </>
  );
}
