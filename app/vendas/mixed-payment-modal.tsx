"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, CreditCard, QrCode, Wallet, WalletCards, X, type LucideIcon } from "lucide-react";
import type { SalesCustomer } from "@/services/vendas.service";
import {
  paymentAmount,
  paymentBreakdown,
  paymentCents,
  paymentLabels,
  type SalePaymentMethod,
  type SalePaymentParts,
} from "@/services/sales-payment";

const money = (value: number) =>
  value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const field =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-right text-sm font-bold text-slate-800 outline-none focus:border-[var(--primary-color)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100";
const icons: Partial<Record<keyof SalePaymentParts, LucideIcon>> = {
  DINHEIRO: Banknote,
  PIX: QrCode,
  DEBITO: CreditCard,
  CREDITO: CreditCard,
  CREDIARIO: WalletCards,
  SALDO_CLIENTE: Wallet,
};

export default function MixedPaymentModal({
  total,
  initialParts,
  customer,
  creditBalance,
  onCardDetails,
  onConfirm,
  onClose,
}: {
  total: number;
  initialParts: SalePaymentParts;
  customer?: SalesCustomer;
  creditBalance: number;
  onCardDetails: (method: "DEBITO" | "CREDITO") => void;
  onConfirm: (parts: SalePaymentParts) => void;
  onClose: () => void;
}) {
  const [parts, setParts] = useState(initialParts);
  const { amounts, remaining } = useMemo(
    () => paymentBreakdown("MISTO", parts, total),
    [parts, total],
  );
  const creditAllowed = Boolean(
    customer &&
      !customer.isSystem &&
      !customer.referenceOnly &&
      Boolean(customer.document?.trim()) &&
      Boolean(customer.address?.trim()) &&
      !customer.creditBlocked &&
      customer.creditDays &&
      Number(customer.creditLimit) > 0,
  );
  const storeCreditAllowed = Boolean(
    customer && !customer.isSystem && creditBalance > 0,
  );
  const valid = paymentCents(remaining) === 0;

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "F3") {
        event.preventDefault();
        setParts(Object.fromEntries(Object.keys(initialParts).map((key) => [key, "0,00"])) as SalePaymentParts);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [initialParts, onClose]);

  function setRemaining(key: keyof SalePaymentParts) {
    const others = Object.entries(parts)
      .filter(([method]) => method !== key)
      .reduce((sum, [, value]) => sum + paymentCents(paymentAmount(value)), 0);
    setParts({
      ...parts,
      [key]: (Math.max(0, paymentCents(total) - others) / 100)
        .toFixed(2)
        .replace(".", ","),
    });
  }

  return (
    <div className="fixed inset-0 z-[124] flex items-center justify-center bg-slate-950/50 p-3 backdrop-blur-sm sm:p-6">
      <section role="dialog" aria-modal="true" aria-labelledby="mixed-payment-title" className="flex max-h-[94vh] w-full max-w-6xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <header className="flex items-start justify-between border-b border-slate-200 p-5 dark:border-slate-800">
          <div className="flex gap-3"><span className="rounded-2xl bg-[var(--primary-bg-light)] p-2.5 text-[var(--primary-color)]"><WalletCards size={24}/></span><div><h2 id="mixed-payment-title" className="text-lg font-black">Pagamento misto</h2><p className="mt-1 text-xs text-slate-500">Venda para {customer?.name || "cliente não selecionado"}</p></div></div>
          <button type="button" onClick={onClose} aria-label="Fechar pagamento misto" className="rounded-xl p-2 text-slate-400 hover:bg-slate-100"><X size={20}/></button>
        </header>
        <div className="grid min-h-0 gap-6 overflow-y-auto p-5 lg:grid-cols-[minmax(0,1fr)_310px]">
          <section className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <div className="grid grid-cols-[38px_minmax(135px,1fr)_145px_136px] gap-2 border-b bg-slate-50 px-4 py-3 text-[11px] font-black uppercase text-slate-500 dark:bg-slate-800/50"><span>#</span><span>Forma de pagamento</span><span>Valor</span><span>Ações rápidas</span></div>
            {Object.entries(parts).map(([key, value], index) => {
              const method = key as keyof SalePaymentParts;
              const Icon = icons[method] || Wallet;
              const disabled = (method === "CREDIARIO" && !creditAllowed) || (method === "SALDO_CLIENTE" && !storeCreditAllowed);
              return <div key={method} className="grid grid-cols-[38px_minmax(135px,1fr)_145px_136px] items-center gap-2 border-b border-slate-100 px-4 py-2.5 last:border-0 dark:border-slate-800">
                <span className="text-xs font-bold text-slate-500">{index + 1}</span>
                <div className="flex min-w-0 items-center gap-2"><span className="rounded-lg bg-[var(--primary-bg-light)] p-2 text-[var(--primary-color)]"><Icon size={16}/></span><div className="min-w-0"><strong className="block text-xs uppercase">{paymentLabels[method]}</strong>{method === "SALDO_CLIENTE" && <span className="text-[10px] text-slate-400">Disponível: {money(creditBalance)}</span>}</div>{(method === "DEBITO" || method === "CREDITO") && <button type="button" onClick={() => onCardDetails(method)} className="text-xs font-bold text-[var(--primary-color)]" title="Dados opcionais do cartão">+</button>}</div>
                <div className="relative"><span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">R$</span><input aria-label={`Valor em ${paymentLabels[method]}`} inputMode="decimal" disabled={disabled} value={value} onFocus={(event) => event.target.select()} onChange={(event) => setParts({ ...parts, [method]: event.target.value })} onBlur={() => { const amount = paymentAmount(value); if (Number.isFinite(amount)) setParts({ ...parts, [method]: amount.toFixed(2).replace(".", ",") }); }} className={`${field} pl-9 disabled:bg-slate-100 disabled:text-slate-400`}/></div>
                <div className="grid grid-cols-2 gap-1"><button type="button" disabled={disabled} onClick={() => setRemaining(method)} className="whitespace-nowrap rounded-lg border border-[var(--primary-border-light)] bg-[var(--primary-bg-light)] px-2 py-2 text-[11px] font-bold text-[var(--primary-color)] disabled:opacity-40">Restante</button><button type="button" disabled={disabled} onClick={() => setParts({ ...parts, [method]: "0,00" })} className="whitespace-nowrap rounded-lg border border-red-200 bg-red-50 px-2 py-2 text-[11px] font-bold text-red-600 disabled:opacity-40">Limpar</button></div>
              </div>;
            })}
          </section>
          <aside className="space-y-5"><section className="rounded-2xl border border-slate-200 p-5 dark:border-slate-800"><h3 className="text-xs font-black uppercase text-slate-600 dark:text-slate-300">Resumo do pagamento</h3><dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between"><dt>Total da venda</dt><dd className="font-black">{money(total)}</dd></div><div className="flex justify-between"><dt>Total informado</dt><dd className="font-black text-[var(--primary-color)]">{money(total - remaining)}</dd></div><div className="border-t border-dashed pt-3 flex justify-between"><dt>Restante a informar</dt><dd className={valid ? "font-black text-[var(--primary-color)]" : "font-black text-red-600"}>{money(Math.abs(remaining))}</dd></div></dl></section><section className="rounded-2xl border border-slate-200 p-5 text-xs text-slate-600 dark:border-slate-800 dark:text-slate-300"><h3 className="font-black uppercase">Atalhos</h3><p className="mt-3"><kbd className="rounded border border-[var(--primary-border-light)] px-1.5 py-1 font-black text-[var(--primary-color)]">F3</kbd><span className="ml-2">Zerar valores lançados</span></p><p className="mt-3"><kbd className="rounded border px-1.5 py-1 font-black">Esc</kbd><span className="ml-2">Cancelar</span></p></section></aside>
        </div>
        <footer className="flex justify-end gap-3 border-t border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900"><button type="button" onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">Cancelar</button><button type="button" disabled={!valid} onClick={() => onConfirm(parts)} className="rounded-xl bg-[var(--primary-color)] px-5 py-3 text-sm font-black text-white hover:bg-[var(--primary-hover)] disabled:cursor-not-allowed disabled:opacity-40">Confirmar pagamento</button></footer>
      </section>
    </div>
  );
}
