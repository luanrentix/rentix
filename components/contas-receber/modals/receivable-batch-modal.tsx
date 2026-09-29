"use client";

import React, { useEffect, useState } from "react";
import {
  Charge,
  PaymentMethod,
  PAYMENT_METHODS,
  formatCurrency,
  formatDateBR,
} from "../receivable-types";
import { X, CheckSquare, AlertCircle, Loader2 } from "lucide-react";
import { getBankAccounts, type BankAccount } from "@/services/bancos.service";

interface ReceivableBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  selectedCharges: Charge[];
  getChargeRemainingAmount: (charge: Charge) => number;
  onConfirmBatch: (data: {
    method: PaymentMethod;
    paidAt: string;
    bankAccountId?: string | null;
  }) => Promise<void>;
}

export function ReceivableBatchModal({
  isOpen,
  onClose,
  selectedCharges,
  getChargeRemainingAmount,
  onConfirmBatch,
}: ReceivableBatchModalProps) {
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    setPaymentMethod("Pix");
    setPaidAt(new Date().toISOString().slice(0, 10));
    setErrorMessage("");

    getBankAccounts()
      .then((accs) => {
        const active = accs.filter((a) => a.active);
        setBankAccounts(active);
        if (active.length > 0) {
          setBankAccountId(active[0].id);
        }
      })
      .catch((err) => console.error("Erro ao carregar contas bancárias:", err));
  }, [isOpen]);

  if (!isOpen || selectedCharges.length === 0) return null;

  const totalAmount = selectedCharges.reduce(
    (sum, c) => sum + getChargeRemainingAmount(c),
    0
  );

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    try {
      setIsSubmitting(true);
      setErrorMessage("");

      await onConfirmBatch({
        method: paymentMethod,
        paidAt,
        bankAccountId: bankAccountId || null,
      });

      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao processar recebimento em lote."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400">
              <CheckSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Recebimento em Lote
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {selectedCharges.length} cobranças selecionadas
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {errorMessage && (
          <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0 inline mr-1" />
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="rounded-2xl bg-emerald-50/60 p-4 text-center dark:bg-emerald-950/30">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400">
              Valor Total a Liquidar:
            </span>
            <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
              {formatCurrency(totalAmount)}
            </div>
          </div>

          <div className="max-h-40 space-y-1.5 overflow-y-auto rounded-2xl border border-slate-200 p-2.5 text-xs dark:border-slate-800">
            {selectedCharges.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
              >
                <div>
                  <p className="font-bold text-slate-800 dark:text-white">
                    {c.tenantName}
                  </p>
                  <p className="text-[10px] text-slate-400">
                    Vencimento: {formatDateBR(c.dueDate)}
                  </p>
                </div>
                <span className="font-black text-slate-900 dark:text-white">
                  {formatCurrency(getChargeRemainingAmount(c))}
                </span>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                Forma de Pagamento
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                {PAYMENT_METHODS.map((m) => (
                  <option key={m.value} value={m.value}>
                    {m.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                Data do Recebimento
              </label>
              <input
                type="date"
                value={paidAt}
                onChange={(e) => setPaidAt(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                required
              />
            </div>
          </div>

          {bankAccounts.length > 0 && (
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-600 dark:text-slate-300">
                Creditar na Conta Bancária (Opcional)
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-emerald-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">Não creditar saldo bancário agora</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (Saldo: {formatCurrency(Number(b.currentBalance || 0))})
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-6 py-2.5 text-xs font-black text-white shadow-lg shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Liquidando...
                </>
              ) : (
                <>
                  <CheckSquare className="h-4 w-4" />
                  Confirmar Baixa em Lote
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
