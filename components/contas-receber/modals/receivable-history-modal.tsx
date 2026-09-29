"use client";

import React from "react";
import { Charge, formatCurrency, formatDateBR } from "../receivable-types";
import { X, CheckCircle2, Calendar, CreditCard, FileText } from "lucide-react";

interface ReceivableHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  charge: Charge | null;
}

export function ReceivableHistoryModal({
  isOpen,
  onClose,
  charge,
}: ReceivableHistoryModalProps) {
  if (!isOpen || !charge) return null;

  const payments = charge.payments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div>
            <h3 className="text-base font-black text-slate-900 dark:text-white">
              Histórico de Recebimentos
            </h3>
            <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
              {charge.tenantName} - {charge.propertyName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 max-h-80 space-y-3 overflow-y-auto">
          {payments.length === 0 ? (
            <p className="py-6 text-center text-xs text-slate-400">
              Nenhum pagamento registrado para esta cobrança.
            </p>
          ) : (
            payments.map((payment, idx) => (
              <div
                key={payment.id || idx}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-800/40"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    Recebimento #{idx + 1}
                  </span>
                  <span className="text-sm font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(Number(payment.amountPaid || 0))}
                  </span>
                </div>

                <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-slate-400" />
                    <span>Data: {formatDateBR(payment.paidAt)}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <CreditCard className="h-3.5 w-3.5 text-slate-400" />
                    <span>Forma: {payment.method}</span>
                  </div>
                </div>

                {payment.paymentItems && payment.paymentItems.length > 0 && (
                  <div className="mt-2 rounded-xl bg-white/80 p-2.5 dark:bg-slate-900/60 border border-slate-200/60 dark:border-slate-800">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
                      Formas de Recebimento:
                    </span>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {payment.paymentItems.map((item, iIndex) => (
                        <span
                          key={iIndex}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300"
                        >
                          <span>{item.method}:</span>
                          <span className="font-black">{formatCurrency(item.amount)}</span>
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {(Number(payment.interest || 0) > 0 || Number(payment.discount || 0) > 0) && (
                  <div className="mt-2 flex gap-3 text-[10px] font-bold">
                    {Number(payment.interest || 0) > 0 && (
                      <span className="text-red-600">
                        + Juros/Multa: {formatCurrency(Number(payment.interest))}
                      </span>
                    )}
                    {Number(payment.discount || 0) > 0 && (
                      <span className="text-emerald-600">
                        - Desconto: {formatCurrency(Number(payment.discount))}
                      </span>
                    )}
                  </div>
                )}

                {payment.note && (
                  <div className="mt-2 flex items-start gap-1 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <FileText className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                    <span>{payment.note}</span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-5 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
