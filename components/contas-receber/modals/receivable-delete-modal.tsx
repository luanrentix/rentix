"use client";

import React, { useState } from "react";
import { Charge, formatCurrency } from "../receivable-types";
import { AlertTriangle, Trash2, RotateCcw, X, Loader2 } from "lucide-react";

interface ReceivableDeleteModalProps {
  isOpen: boolean;
  onClose: () => void;
  charge: Charge | null;
  mode: "delete" | "reversal";
  onConfirm: () => Promise<void>;
}

export function ReceivableDeleteModal({
  isOpen,
  onClose,
  charge,
  mode,
  onConfirm,
}: ReceivableDeleteModalProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  if (!isOpen || !charge) return null;

  const isReversal = mode === "reversal";

  async function handleConfirm() {
    try {
      setIsProcessing(true);
      setErrorMessage("");
      await onConfirm();
      onClose();
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Erro ao processar solicitação."
      );
    } finally {
      setIsProcessing(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-2xl ${
                isReversal
                  ? "bg-amber-50 text-amber-600 dark:bg-amber-950/60 dark:text-amber-400"
                  : "bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400"
              }`}
            >
              {isReversal ? (
                <RotateCcw className="h-5 w-5" />
              ) : (
                <AlertTriangle className="h-5 w-5" />
              )}
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                {isReversal ? "Estornar Recebimento" : "Excluir Cobrança"}
              </h3>
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                Ação de integridade financeira e contábil.
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
            {errorMessage}
          </div>
        )}

        <div className="mt-4 space-y-3">
          <p className="text-xs text-slate-600 dark:text-slate-300">
            {isReversal
              ? `Tem certeza que deseja estornar os recebimentos de "${charge.tenantName}" para "${charge.propertyName}"? O status voltará a Em Aberto e o repasse automático ao proprietário (se gerado) será cancelado.`
              : `Tem certeza que deseja excluir permanentemente a cobrança de "${charge.tenantName}" no valor de ${formatCurrency(
                  charge.amount
                )}?`}
          </p>

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-bold text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
            Aviso: Se esta cobrança gerou repasse automático ao proprietário no Contas a Pagar, o repasse também será automaticamente ajustado ou removido pelo sistema.
          </div>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            disabled={isProcessing}
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isProcessing}
            className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs font-black text-white shadow-lg active:scale-95 disabled:opacity-50 ${
              isReversal
                ? "bg-amber-600 shadow-amber-600/20 hover:bg-amber-700"
                : "bg-red-600 shadow-red-600/20 hover:bg-red-700"
            }`}
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Processando...
              </>
            ) : isReversal ? (
              <>
                <RotateCcw className="h-4 w-4" />
                Confirmar Estorno
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4" />
                Confirmar Exclusão
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
