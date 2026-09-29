"use client";

import React, { useEffect, useState } from "react";
import {
  Expense,
  PaymentMethod,
  PaymentSplitItem,
  PAYMENT_METHODS,
  formatCurrency,
  formatDateBR,
  parseCurrencyToNumber,
  formatCurrencyInput,
} from "../payable-types";
import {
  X,
  CheckCircle2,
  AlertCircle,
  Building2,
  DollarSign,
  Calendar,
  CreditCard,
  Wallet,
  Loader2,
  Plus,
  Trash2,
  Split,
  Sparkles,
} from "lucide-react";
import { getBankAccounts, type BankAccount } from "@/services/bancos.service";

interface PayablePaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  expense: Expense | null;
  remainingAmount: number;
  onConfirmPayment: (data: {
    amountPaid: number;
    interest: number;
    discount: number;
    method: PaymentMethod;
    paidAt: string;
    note?: string;
    bankAccountId?: string | null;
    paymentItems?: Array<{
      method: PaymentMethod;
      amount: number;
    }>;
  }) => Promise<void>;
}

export function PayablePaymentModal({
  isOpen,
  onClose,
  expense,
  remainingAmount,
  onConfirmPayment,
}: PayablePaymentModalProps) {
  const [paymentMode, setPaymentMode] = useState<"single" | "split">("single");
  const [amountStr, setAmountStr] = useState("");
  const [interestStr, setInterestStr] = useState("");
  const [discountStr, setDiscountStr] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Pix");
  const [paidAt, setPaidAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState("");
  const [bankAccountId, setBankAccountId] = useState<string>("");
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Estado para múltiplas formas de pagamento (Split Payment)
  const [splitItems, setSplitItems] = useState<PaymentSplitItem[]>([]);

  useEffect(() => {
    if (!isOpen || !expense) return;

    const initialAmountCents = Math.round(remainingAmount * 100);
    setAmountStr(formatCurrencyInput(initialAmountCents));
    setInterestStr("");
    setDiscountStr("");
    setPaymentMethod("Pix");
    setPaidAt(new Date().toISOString().slice(0, 10));
    setNote("");
    setErrorMessage("");
    setPaymentMode("single");

    // Inicializa splitItems com 2 linhas sugeridas
    setSplitItems([
      {
        id: "split-1",
        method: "Pix",
        amount: Number((remainingAmount / 2).toFixed(2)),
        amountStr: formatCurrencyInput(Math.round((remainingAmount / 2) * 100)),
      },
      {
        id: "split-2",
        method: "BankSlip",
        amount: Number((remainingAmount - Number((remainingAmount / 2).toFixed(2))).toFixed(2)),
        amountStr: formatCurrencyInput(
          Math.round((remainingAmount - Number((remainingAmount / 2).toFixed(2))) * 100)
        ),
      },
    ]);

    getBankAccounts()
      .then((accs) => {
        const active = accs.filter((a) => a.active);
        setBankAccounts(active);
        if (active.length > 0) {
          setBankAccountId(active[0].id);
        }
      })
      .catch((err) => console.error("Erro ao carregar contas bancárias:", err));
  }, [isOpen, expense, remainingAmount]);

  if (!isOpen || !expense) return null;

  // Cálculos de valores
  const singleBaseAmount = parseCurrencyToNumber(amountStr);
  const totalSplitAmount = splitItems.reduce((acc, it) => acc + (it.amount || 0), 0);
  const baseAmount = paymentMode === "single" ? singleBaseAmount : totalSplitAmount;

  const interest = parseCurrencyToNumber(interestStr);
  const discount = parseCurrencyToNumber(discountStr);
  const totalSettlement = Math.max(0, baseAmount + interest - discount);

  // Diferença do split em relação ao saldo da conta
  const splitDifference = Number((remainingAmount - totalSplitAmount).toFixed(2));

  // Handlers para gerenciar os itens do split
  function handleAddSplitItem() {
    const nextAmount = Math.max(0, splitDifference);
    const newItem: PaymentSplitItem = {
      id: `split-${Date.now()}`,
      method: "Pix",
      amount: nextAmount,
      amountStr: nextAmount > 0 ? formatCurrencyInput(Math.round(nextAmount * 100)) : "0,00",
    };
    setSplitItems((prev) => [...prev, newItem]);
  }

  function handleRemoveSplitItem(id: string) {
    if (splitItems.length <= 1) return;
    setSplitItems((prev) => prev.filter((it) => it.id !== id));
  }

  function handleUpdateSplitItemMethod(id: string, method: PaymentMethod) {
    setSplitItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, method } : it))
    );
  }

  function handleUpdateSplitItemAmount(id: string, rawVal: string) {
    const numericCents = rawVal.replace(/\D/g, "");
    const numeric = Number(numericCents) / 100;
    setSplitItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              amount: numeric,
              amountStr: formatCurrencyInput(numericCents),
            }
          : it
      )
    );
  }

  function handleAutoDistributeRemaining(id: string) {
    const otherItemsSum = splitItems
      .filter((it) => it.id !== id)
      .reduce((sum, it) => sum + it.amount, 0);
    const balance = Math.max(0, Number((remainingAmount - otherItemsSum).toFixed(2)));
    setSplitItems((prev) =>
      prev.map((it) =>
        it.id === id
          ? {
              ...it,
              amount: balance,
              amountStr: formatCurrencyInput(Math.round(balance * 100)),
            }
          : it
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (baseAmount <= 0) {
      setErrorMessage("Informe um valor de pagamento válido maior que zero.");
      return;
    }

    if (baseAmount > remainingAmount + 0.01) {
      setErrorMessage(
        `O valor informado (${formatCurrency(
          baseAmount
        )}) excede o saldo restante da conta (${formatCurrency(remainingAmount)}).`
      );
      return;
    }

    if (paymentMode === "split") {
      const invalidItem = splitItems.find((it) => it.amount <= 0);
      if (invalidItem) {
        setErrorMessage("Todas as formas de pagamento devem ter um valor maior que zero.");
        return;
      }
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const paymentItemsPayload =
        paymentMode === "split"
          ? splitItems.map((it) => ({
              method: it.method,
              amount: it.amount,
            }))
          : [
              {
                method: paymentMethod,
                amount: baseAmount,
              },
            ];

      const primaryMethod =
        paymentMode === "split" ? splitItems[0]?.method || "Pix" : paymentMethod;

      await onConfirmPayment({
        amountPaid: baseAmount,
        interest,
        discount,
        method: primaryMethod,
        paidAt,
        note: note.trim() || undefined,
        bankAccountId: bankAccountId || null,
        paymentItems: paymentItemsPayload,
      });

      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao registrar pagamento."
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

      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 max-h-[92vh] flex flex-col">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4 dark:border-slate-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                Liquidar / Confirmar Pagamento
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                {expense.description} {expense.personName ? `• ${expense.personName}` : ""}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Mensagem de Erro */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-200 bg-red-50 p-3 text-xs font-bold text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Formulário com rolagem interna */}
        <form onSubmit={handleSubmit} className="mt-4 space-y-4 overflow-y-auto pr-1 flex-1">
          {/* Card de Resumo do Saldo */}
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-slate-50 p-3.5 text-xs dark:bg-slate-800/50">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Saldo a Pagar:
              </span>
              <p className="text-base font-black text-slate-900 dark:text-white">
                {formatCurrency(remainingAmount)}
              </p>
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Vencimento:
              </span>
              <p className="text-base font-black text-slate-700 dark:text-slate-300">
                {formatDateBR(expense.dueDate)}
              </p>
            </div>
          </div>

          {/* Seletor de Modalidade: Única vs Múltiplas Formas */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Modalidade de Pagamento
              </label>
              <span className="text-[11px] font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" />
                Suporta desmembramento
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5 rounded-2xl bg-slate-100 p-1 dark:bg-slate-800">
              <button
                type="button"
                onClick={() => setPaymentMode("single")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition ${
                  paymentMode === "single"
                    ? "bg-white text-slate-900 shadow-sm dark:bg-slate-700 dark:text-white"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <CreditCard className="h-3.5 w-3.5" />
                Forma Única
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode("split")}
                className={`flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-black transition ${
                  paymentMode === "split"
                    ? "bg-white text-red-600 shadow-sm dark:bg-slate-700 dark:text-red-400"
                    : "text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }`}
              >
                <Split className="h-3.5 w-3.5" />
                Múltiplas Formas (Split)
              </button>
            </div>
          </div>

          {/* Modo Único */}
          {paymentMode === "single" ? (
            <div className="space-y-3.5">
              <div>
                <label className="mb-1 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Valor Pago (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-3 text-sm font-bold text-slate-400">
                    R$
                  </span>
                  <input
                    type="text"
                    value={amountStr}
                    onChange={(e) => {
                      const val = e.target.value.replace(/\D/g, "");
                      setAmountStr(formatCurrencyInput(val));
                    }}
                    className="w-full rounded-2xl border border-slate-200 bg-white py-2.5 pl-11 pr-4 text-base font-black text-slate-900 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                  Forma de Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                  className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* Modo Múltiplas Formas (Split) */
            <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-800/40">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                    Formas de Pagamento Desmembradas
                  </span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Ex: R$ 20,00 no Pix + R$ 30,00 no Boleto / Cartão
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddSplitItem}
                  className="inline-flex items-center gap-1 rounded-xl bg-red-50 px-2.5 py-1.5 text-xs font-black text-red-700 hover:bg-red-100 dark:bg-red-950/60 dark:text-red-300 dark:hover:bg-red-900/60"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Adicionar Forma
                </button>
              </div>

              {/* Lista de Formas */}
              <div className="space-y-2.5">
                {splitItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white p-2 dark:border-slate-700 dark:bg-slate-800"
                  >
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[11px] font-black text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                      {index + 1}
                    </span>

                    {/* Select da Forma */}
                    <div className="w-1/2">
                      <select
                        value={item.method}
                        onChange={(e) =>
                          handleUpdateSplitItemMethod(item.id, e.target.value as PaymentMethod)
                        }
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-800 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      >
                        {PAYMENT_METHODS.map((m) => (
                          <option key={m.value} value={m.value}>
                            {m.label}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Input de Valor */}
                    <div className="relative flex-1">
                      <span className="absolute left-2 top-1.5 text-[10px] font-bold text-slate-400">
                        R$
                      </span>
                      <input
                        type="text"
                        value={item.amountStr}
                        onChange={(e) => handleUpdateSplitItemAmount(item.id, e.target.value)}
                        className="w-full rounded-lg border border-slate-200 bg-slate-50 py-1.5 pl-7 pr-2 text-xs font-black text-slate-900 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
                        placeholder="0,00"
                      />
                    </div>

                    {/* Botão de Auto-Completar */}
                    <button
                      type="button"
                      onClick={() => handleAutoDistributeRemaining(item.id)}
                      title="Preencher com o restante do saldo"
                      className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-red-600 dark:hover:bg-slate-700"
                    >
                      <Sparkles className="h-3.5 w-3.5" />
                    </button>

                    {/* Botão de Remover */}
                    {splitItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveSplitItem(item.id)}
                        title="Remover forma"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>

              {/* Barra de Somatório do Split */}
              <div className="flex items-center justify-between rounded-xl bg-slate-100 p-2.5 text-xs dark:bg-slate-800">
                <div>
                  <span className="text-slate-500 dark:text-slate-400 font-semibold">
                    Total das formas:
                  </span>{" "}
                  <strong className="font-black text-slate-900 dark:text-white">
                    {formatCurrency(totalSplitAmount)}
                  </strong>
                </div>
                {splitDifference !== 0 && (
                  <div
                    className={`text-[11px] font-bold ${
                      splitDifference > 0
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-red-600 dark:text-red-400"
                    }`}
                  >
                    {splitDifference > 0
                      ? `Resta distribuir: ${formatCurrency(splitDifference)}`
                      : `Excede em: ${formatCurrency(Math.abs(splitDifference))}`}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Juros e Descontos */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                + Juros / Encargos
              </label>
              <input
                type="text"
                value={interestStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setInterestStr(val ? formatCurrencyInput(val) : "");
                }}
                placeholder="R$ 0,00"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
                - Desconto Obtido
              </label>
              <input
                type="text"
                value={discountStr}
                onChange={(e) => {
                  const val = e.target.value.replace(/\D/g, "");
                  setDiscountStr(val ? formatCurrencyInput(val) : "");
                }}
                placeholder="R$ 0,00"
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-800 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              />
            </div>
          </div>

          {/* Data do Pagamento */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
              Data do Pagamento *
            </label>
            <input
              type="date"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              required
            />
          </div>

          {/* Seleção de Conta Bancária */}
          {bankAccounts.length > 0 && (
            <div>
              <label className="mb-1 flex items-center justify-between text-xs font-bold text-slate-500 dark:text-slate-400">
                <span>Debitar da Conta Bancária (Opcional)</span>
                <span className="text-[10px] text-red-600 font-bold">Sincroniza o Caixa</span>
              </label>
              <select
                value={bankAccountId}
                onChange={(e) => setBankAccountId(e.target.value)}
                className="w-full rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <option value="">Não debitar saldo bancário agora</option>
                {bankAccounts.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name} (Saldo: {formatCurrency(Number(b.currentBalance || 0))})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Observações */}
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500 dark:text-slate-400">
              Observações
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Ex: Pago com recibo em anexo, comprovante enviado por e-mail..."
              rows={2}
              className="w-full rounded-2xl border border-slate-200 bg-white p-3 text-xs font-medium text-slate-700 outline-none focus:border-red-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            />
          </div>

          {/* Rodapé e Botões */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-5 py-3 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              disabled={isSubmitting}
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-2 rounded-2xl bg-red-600 px-6 py-3 text-xs font-black text-white shadow-lg shadow-red-600/20 hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4" />
                  Confirmar ({formatCurrency(totalSettlement)})
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
