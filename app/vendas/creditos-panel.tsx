"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import {
  adjustCustomerCredit,
  getCustomerCredits,
  getSalesRefunds,
  settleSalesRefund,
  type CreditCustomer,
  type Refund,
} from "@/services/sales-credit";
import ConfirmationModal from "@/components/ui/confirmation-modal";
const money = (value: string | number) =>
  Number(value).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const field = "w-full rounded-xl border bg-white p-2 text-sm dark:bg-slate-900";
export default function CustomerCreditsPanel({
  refundsOnly = false,
}: {
  refundsOnly?: boolean;
}) {
  const { user } = useAuth();
  const allowed = ["OWNER", "ADMIN", "SYSTEM_OWNER", "DONO_SISTEMA"].includes(
    user?.role || "",
  );
  const [customers, setCustomers] = useState<CreditCustomer[]>([]);
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selected, setSelected] = useState<CreditCustomer | null>(null);
  const [action, setAction] = useState<{
    customer?: CreditCustomer;
    refund?: Refund;
    requestId: string;
  } | null>(null);
  const [direction, setDirection] = useState<"ADD" | "DEDUCT">("ADD");
  const [disposition, setDisposition] = useState<"REFUND" | "CREDIT">("REFUND");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const locked = useRef(false);
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        getCustomerCredits(),
        getSalesRefunds(),
      ]);
      setCustomers(c);
      setRefunds(r);
      setError("");
    } catch (cause) {
      setError(
        cause instanceof Error
          ? cause.message
          : "Não foi possível consultar créditos e reembolsos. Verifique a migração do módulo.",
      );
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  function start(next: { customer?: CreditCustomer; refund?: Refund }) {
    setAction({ ...next, requestId: crypto.randomUUID() });
    setReason("");
    setAmount(
      next.refund
        ? (Number(next.refund.amount) - Number(next.refund.settledAmount))
            .toFixed(2)
            .replace(".", ",")
        : "",
    );
    setDirection("ADD");
    setDisposition("REFUND");
    setError("");
  }
  async function confirm() {
    if (!action || locked.current) return;
    const value = Number(
      amount.includes(",")
        ? amount.replace(/\./g, "").replace(",", ".")
        : amount,
    );
    if (!Number.isFinite(value) || value <= 0 || reason.trim().length < 3) {
      setError(
        "Informe valor positivo e justificativa de pelo menos 3 caracteres.",
      );
      return;
    }
    locked.current = true;
    setBusy(true);
    setError("");
    try {
      if (action.customer)
        await adjustCustomerCredit({
          customerId: action.customer.id,
          requestId: action.requestId,
          direction,
          amount: value,
          reason: reason.trim(),
        });
      if (action.refund)
        await settleSalesRefund(action.refund.id, {
          requestId: action.requestId,
          disposition,
          amount: value,
          reason: reason.trim(),
        });
      setAction(null);
      setMessage("Operação registrada com sucesso.");
      await load();
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : "Falha ao registrar operação.",
      );
    } finally {
      locked.current = false;
      setBusy(false);
    }
  }
  return (
    <section className="space-y-4">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-xl font-black">
          {refundsOnly ? "Devoluções financeiras" : "Créditos de Clientes"}
        </h2>
        <button
          type="button"
          onClick={() => void load()}
          disabled={loading}
          className="rounded-xl border px-3 py-2"
        >
          Atualizar
        </button>
      </header>
      {error && !action && (
        <p role="alert" className="rounded-xl bg-red-50 p-3 text-red-700">
          {error}
        </p>
      )}
      {message && <p role="status">{message}</p>}
      {!refundsOnly && (
        <>
          <p className="rounded-xl border p-3">
            Saldo de créditos devido aos clientes:{" "}
            <b>
              {money(
                customers.reduce((sum, item) => sum + Number(item.balance), 0),
              )}
            </b>
            . Créditos não representam entrada de dinheiro.
          </p>
          <div className="flex flex-wrap gap-3">
            <input
              className={field}
              aria-label="Buscar cliente"
              placeholder="Buscar cliente"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
            <label>
              <input
                type="checkbox"
                checked={showAll}
                onChange={(event) => setShowAll(event.target.checked)}
              />{" "}
              Mostrar também clientes sem saldo (concessão manual)
            </label>
          </div>
          {loading ? (
            <p>Carregando...</p>
          ) : (
            customers
              .filter(
                (item) =>
                  (showAll || Number(item.balance) > 0) &&
                  item.name
                    .toLocaleLowerCase("pt-BR")
                    .includes(query.toLocaleLowerCase("pt-BR")),
              )
              .map((item) => (
                <article
                  key={item.id}
                  className="flex flex-wrap items-center gap-3 rounded-2xl border bg-white p-4 dark:bg-slate-900"
                >
                  <b className="flex-1">
                    {item.name}
                    {!item.active && " (inativo)"}
                  </b>
                  <strong>{money(item.balance)}</strong>
                  <button
                    type="button"
                    onClick={() => setSelected(item)}
                    className="rounded-xl border p-2"
                  >
                    Histórico
                  </button>
                  {allowed && item.active && (
                    <button
                      type="button"
                      onClick={() => start({ customer: item })}
                      className="rounded-xl border p-2"
                    >
                      Conceder / ajustar
                    </button>
                  )}
                </article>
              ))
          )}
        </>
      )}
      <h3 className="font-black">Reembolsos solicitados e confirmações</h3>
      <p className="text-sm text-slate-500">
        Confirme somente após a devolução efetiva em dinheiro, Pix ou cartão. É
        possível liquidar parte do valor ou conceder crédito a cliente
        identificado.
      </p>
      {refunds.map((refund) => (
        <article
          key={refund.id}
          className="space-y-2 rounded-2xl border bg-white p-4 dark:bg-slate-900"
        >
          <p>
            Venda #{refund.order.number} - {refund.order.customerName} -{" "}
            {refund.order.paymentMethod} - {refund.transaction.bankAccount.name}{" "}
            · {refund.reason}
          </p>
          <p>
            Total: {money(refund.amount)} · Liquidado:{" "}
            {money(refund.settledAmount)} · Pendente:{" "}
            <b>{money(Number(refund.amount) - Number(refund.settledAmount))}</b>
          </p>
          {refund.settlements.map((entry) => (
            <p key={entry.id} className="text-xs">
              {new Date(entry.createdAt).toLocaleString("pt-BR")} ·{" "}
              {entry.disposition === "CREDIT"
                ? "Crédito concedido"
                : "Devolução confirmada"}{" "}
              · {money(entry.amount)} · {entry.reason} · Usuário:{" "}
              {entry.actor.name}
            </p>
          ))}
          {allowed && Number(refund.amount) > Number(refund.settledAmount) && (
            <button
              type="button"
              onClick={() => start({ refund })}
              className="rounded-xl border px-3 py-2"
            >
              Confirmar devolução / gerar crédito
            </button>
          )}
        </article>
      ))}
      {!loading && !refunds.length && (
        <p className="text-sm text-slate-500">Nenhum reembolso solicitado.</p>
      )}
      {selected && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-950/50 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-label="Histórico de crédito"
            className="max-h-[90dvh] w-full max-w-3xl space-y-3 overflow-y-auto rounded-3xl bg-white p-5 dark:bg-slate-900"
          >
            <h3 className="font-black">
              {selected.name} · {money(selected.balance)}
            </h3>
            <p className="text-sm">
              Valor original gerado:{" "}
              {money(
                [...selected.entries, ...selected.adjustments]
                  .filter((entry) => Number(entry.amount) > 0)
                  .reduce((sum, entry) => sum + Number(entry.amount), 0),
              )}{" "}
              · Utilizado em vendas:{" "}
              {money(
                selected.entries
                  .filter(
                    (entry) => Number(entry.amount) < 0 && !entry.reversedAt,
                  )
                  .reduce((sum, entry) => sum - Number(entry.amount), 0),
              )}
            </p>
            {[...selected.entries, ...selected.adjustments]
              .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
              .map((entry) => (
                <p key={entry.id} className="rounded-xl border p-3 text-sm">
                  {new Date(entry.createdAt).toLocaleString("pt-BR")} ·{" "}
                  {money(entry.amount)} · {entry.reason}
                  {entry.reversedAt && " · REVERTIDO"}
                  <br />
                  Origem: {entry.orderId || "Ajuste manual"} · Responsável:{" "}
                  {entry.actor?.name ||
                    entry.actorId ||
                    "Consultar evento da venda"}
                </p>
              ))}
            <button
              autoFocus
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-xl border px-4 py-2"
            >
              Fechar
            </button>
          </section>
        </div>
      )}
      {action && (
        <ConfirmationModal
          title={
            action.customer
              ? "Conceder / ajustar crédito"
              : "Liquidar reembolso"
          }
          description={
            action.customer?.name ||
            "Registre a devolução confirmada ou converta o valor em crédito."
          }
          confirmLabel="Confirmar operação"
          busyLabel="Registrando..."
          busy={busy}
          error={error}
          onConfirm={() => void confirm()}
          onCancel={() => {
            if (!busy) setAction(null);
          }}
        >
          <div className="space-y-3">
            {action.customer ? (
              <select
                aria-label="Operação de crédito"
                className={field}
                value={direction}
                onChange={(event) =>
                  setDirection(event.target.value as typeof direction)
                }
                disabled={busy}
              >
                <option value="ADD">Adicionar crédito / ajuste positivo</option>
                <option value="DEDUCT">Ajuste negativo / reversão</option>
              </select>
            ) : (
              <select
                aria-label="Destino do reembolso"
                className={field}
                value={disposition}
                onChange={(event) =>
                  setDisposition(event.target.value as typeof disposition)
                }
                disabled={busy}
              >
                <option value="REFUND">
                  Devolução financeira efetivamente confirmada
                </option>
                <option value="CREDIT">Gerar crédito para o cliente</option>
              </select>
            )}
            <label className="block">
              Valor
              <input
                className={field}
                inputMode="decimal"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                disabled={busy}
              />
            </label>
            <label className="block">
              Justificativa / confirmação da devolução
              <textarea
                className={field}
                maxLength={500}
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                disabled={busy}
              />
            </label>
          </div>
        </ConfirmationModal>
      )}
    </section>
  );
}
