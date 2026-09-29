"use client";

import React from "react";
import {
  Expense,
  formatCurrency,
  formatDateBR,
  Tenant,
} from "./payable-types";
import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Building2,
  MessageCircle,
  MoreVertical,
  Printer,
  RotateCcw,
  Edit2,
  Trash2,
  Eye,
} from "lucide-react";

interface PayableMobileCardsProps {
  expenses: Expense[];
  people: Tenant[];
  onOpenPaymentModal: (expense: Expense) => void;
  onOpenEditModal: (expense: Expense) => void;
  onOpenDeleteModal: (expense: Expense) => void;
  onOpenReversalModal: (expense: Expense) => void;
  onPrintReceipt: (expense: Expense) => void;
  onViewPayments: (expense: Expense) => void;
  getExpenseRemainingAmount: (expense: Expense) => number;
  getExpensePaidAmount: (expense: Expense) => number;
}

export function PayableMobileCards({
  expenses,
  people,
  onOpenPaymentModal,
  onOpenEditModal,
  onOpenDeleteModal,
  onOpenReversalModal,
  onPrintReceipt,
  onViewPayments,
  getExpenseRemainingAmount,
  getExpensePaidAmount,
}: PayableMobileCardsProps) {
  function getPersonPhone(personId?: string | null): string | null {
    if (!personId) return null;
    const p = people.find((item) => item.id === personId);
    return p?.phone || null;
  }

  function getWhatsAppUrl(phone: string, expense: Expense) {
    const cleanPhone = phone.replace(/\D/g, "");
    const formattedPhone = cleanPhone.length <= 11 ? `55${cleanPhone}` : cleanPhone;
    const msg = `Olá! Referente à conta *${expense.description}* no valor de *${formatCurrency(
      expense.amount
    )}*, com vencimento em *${formatDateBR(expense.dueDate)}*.`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(msg)}`;
  }

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
      {expenses.map((expense) => {
        const remaining = getExpenseRemainingAmount(expense);
        const paid = getExpensePaidAmount(expense);
        const isPaid = expense.status === "Paid";
        const isOverdue = expense.status === "Overdue";
        const supplierPhone = getPersonPhone(expense.personId);

        return (
          <div
            key={expense.id}
            className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div>
              {/* Header do Card */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="text-sm font-black text-slate-900 dark:text-white">
                    {expense.description}
                  </h4>
                  <p className="text-xs font-semibold text-slate-500 dark:text-slate-400">
                    {expense.personName || "Fornecedor não informado"}
                  </p>
                </div>

                {isPaid ? (
                  <span className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                    <CheckCircle2 className="h-3 w-3" />
                    Pago
                  </span>
                ) : isOverdue ? (
                  <span className="inline-flex items-center gap-1 rounded-xl border border-red-200 bg-red-50 px-2 py-0.5 text-[10px] font-black text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                    <AlertTriangle className="h-3 w-3" />
                    Vencido
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 rounded-xl border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                    <Clock className="h-3 w-3" />
                    Em aberto
                  </span>
                )}
              </div>

              {/* Detalhes intermediários */}
              <div className="mt-3 space-y-1.5 rounded-2xl bg-slate-50 p-3 text-xs dark:bg-slate-800/50">
                <div className="flex justify-between">
                  <span className="text-slate-400">Vencimento:</span>
                  <span
                    className={`font-black ${
                      isOverdue
                        ? "text-red-600 dark:text-red-400"
                        : "text-slate-700 dark:text-slate-200"
                    }`}
                  >
                    {formatDateBR(expense.dueDate)}
                  </span>
                </div>

                {expense.property?.title && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Bem/Ativo:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {expense.property.title}
                    </span>
                  </div>
                )}

                {expense.category && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Categoria:</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-200">
                      {expense.category}
                    </span>
                  </div>
                )}

                <div className="flex justify-between border-t border-slate-200/60 pt-1.5 dark:border-slate-700">
                  <span className="font-bold text-slate-500">Saldo Restante:</span>
                  <span
                    className={`font-black ${
                      isPaid
                        ? "text-emerald-600"
                        : isOverdue
                        ? "text-red-600"
                        : "text-slate-900 dark:text-white"
                    }`}
                  >
                    {formatCurrency(remaining)}
                  </span>
                </div>
              </div>
            </div>

            {/* Ações inferiores */}
            <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                {supplierPhone && (
                  <a
                    href={getWhatsAppUrl(supplierPhone, expense)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-100 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </a>
                )}
                <button
                  type="button"
                  onClick={() => onOpenEditModal(expense)}
                  className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                  title="Editar"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => onOpenDeleteModal(expense)}
                  className="rounded-xl border border-slate-200 p-2 text-red-600 hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/40"
                  title="Excluir"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>

              {!isPaid && (
                <button
                  type="button"
                  onClick={() => onOpenPaymentModal(expense)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-black text-white shadow-sm hover:bg-emerald-700"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Pagar
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
