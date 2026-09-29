"use client";

import React, { useState, useEffect } from "react";
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
  MoreVertical,
  Edit2,
  Trash2,
  RotateCcw,
  Printer,
  MessageCircle,
  Building2,
  Receipt,
  Eye,
} from "lucide-react";

interface PayableTableProps {
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

export function PayableTable({
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
}: PayableTableProps) {
  const [menuTarget, setMenuTarget] = useState<{
    expense: Expense;
    top: number;
    left: number;
  } | null>(null);

  useEffect(() => {
    if (!menuTarget) return;

    function handleDismiss() {
      setMenuTarget(null);
    }

    window.addEventListener("scroll", handleDismiss, true);
    window.addEventListener("resize", handleDismiss);

    return () => {
      window.removeEventListener("scroll", handleDismiss, true);
      window.removeEventListener("resize", handleDismiss);
    };
  }, [menuTarget]);

  function handleToggleMenu(
    expense: Expense,
    event: React.MouseEvent<HTMLButtonElement>
  ) {
    event.stopPropagation();
    if (menuTarget?.expense.id === expense.id) {
      setMenuTarget(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const menuWidth = 200;
    const estimatedMenuHeight = 230;
    const spaceBelow = window.innerHeight - rect.bottom;
    const openUp = spaceBelow < estimatedMenuHeight && rect.top > estimatedMenuHeight;

    const top = openUp
      ? Math.max(10, rect.top - estimatedMenuHeight - 4)
      : Math.min(window.innerHeight - estimatedMenuHeight - 10, rect.bottom + 6);

    const left = Math.min(
      Math.max(10, rect.right - menuWidth),
      window.innerWidth - menuWidth - 10
    );

    setMenuTarget({
      expense,
      top,
      left,
    });
  }

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

  if (expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center dark:border-slate-800 dark:bg-slate-900">
        <Receipt className="h-12 w-12 text-slate-300 dark:text-slate-600" />
        <h3 className="mt-4 text-base font-bold text-slate-900 dark:text-white">
          Nenhuma conta a pagar encontrada
        </h3>
        <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
          Tente ajustar os filtros de busca ou cadastre uma nova despesa.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-black uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-400">
            <tr>
              <th className="py-4 pl-6 pr-3">Descrição / Categoria</th>
              <th className="px-3 py-4">Fornecedor / Pessoa</th>
              <th className="px-3 py-4">Bem / Ativo</th>
              <th className="px-3 py-4">Vencimento</th>
              <th className="px-3 py-4">Status</th>
              <th className="px-3 py-4 text-right">Valor Nominal</th>
              <th className="px-3 py-4 text-right">Saldo Restante</th>
              <th className="py-4 pl-3 pr-6 text-center">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {expenses.map((expense) => {
              const remaining = getExpenseRemainingAmount(expense);
              const paid = getExpensePaidAmount(expense);
              const isPaid = expense.status === "Paid";
              const isOverdue = expense.status === "Overdue";
              const supplierPhone = getPersonPhone(expense.personId);
              const isRepasse =
                expense.category?.toUpperCase() === "REPASSE PROPRIETARIO" ||
                expense.installmentGroupId?.startsWith("owner_payout_");

              return (
                <tr
                  key={expense.id}
                  className="transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30"
                >
                  {/* Descrição e Categoria */}
                  <td className="py-3.5 pl-6 pr-3">
                    <div className="font-bold text-slate-900 dark:text-white">
                      {expense.description}
                      {expense.installmentNumber && expense.installmentTotal && (
                        <span className="ml-2 inline-flex items-center rounded-lg bg-slate-100 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          {expense.installmentNumber}/{expense.installmentTotal}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                      <span>{expense.category || "Sem categoria"}</span>
                      {isRepasse && (
                        <span className="rounded bg-indigo-50 px-1 text-[9px] font-black text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300">
                          REPASSE
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Fornecedor */}
                  <td className="px-3 py-3.5">
                    <div className="font-bold text-slate-700 dark:text-slate-200">
                      {expense.personName || "Fornecedor não informado"}
                    </div>
                    {supplierPhone && (
                      <a
                        href={getWhatsAppUrl(supplierPhone, expense)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400"
                        title="Conversar pelo WhatsApp"
                      >
                        <MessageCircle className="h-3 w-3" />
                        {supplierPhone}
                      </a>
                    )}
                  </td>

                  {/* Bem / Imóvel Vinculado */}
                  <td className="px-3 py-3.5">
                    {expense.property?.title ? (
                      <div className="flex items-center gap-1.5 font-semibold text-slate-600 dark:text-slate-300">
                        <Building2 className="h-3.5 w-3.5 text-slate-400" />
                        <span>{expense.property.title}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400">-</span>
                    )}
                  </td>

                  {/* Vencimento */}
                  <td className="px-3 py-3.5">
                    <div
                      className={`font-black ${
                        isOverdue
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-700 dark:text-slate-200"
                      }`}
                    >
                      {formatDateBR(expense.dueDate)}
                    </div>
                    {expense.issueDate && (
                      <span className="text-[10px] text-slate-400">
                        Emissão: {formatDateBR(expense.issueDate)}
                      </span>
                    )}
                  </td>

                  {/* Status Badge */}
                  <td className="px-3 py-3.5">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400">
                        <CheckCircle2 className="h-3 w-3" />
                        Pago
                      </span>
                    ) : isOverdue ? (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-2.5 py-1 text-[11px] font-black text-red-700 dark:border-red-800 dark:bg-red-950/40 dark:text-red-400">
                        <AlertTriangle className="h-3 w-3" />
                        Vencido
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-2.5 py-1 text-[11px] font-black text-amber-700 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-400">
                        <Clock className="h-3 w-3" />
                        Em aberto
                      </span>
                    )}
                  </td>

                  {/* Valor Nominal */}
                  <td className="px-3 py-3.5 text-right font-bold text-slate-700 dark:text-slate-300">
                    {formatCurrency(expense.amount)}
                  </td>

                  {/* Saldo Restante */}
                  <td className="px-3 py-3.5 text-right">
                    <span
                      className={`text-sm font-black ${
                        isPaid
                          ? "text-emerald-600 dark:text-emerald-400"
                          : isOverdue
                          ? "text-red-600 dark:text-red-400"
                          : "text-slate-900 dark:text-white"
                      }`}
                    >
                      {formatCurrency(remaining)}
                    </span>
                    {paid > 0 && (
                      <div className="text-[10px] font-bold text-slate-400">
                        Pago: {formatCurrency(paid)}
                      </div>
                    )}
                  </td>

                  {/* Ações */}
                  <td className="py-3.5 pl-3 pr-6 text-center">
                    <div className="relative inline-flex items-center gap-1.5">
                      {!isPaid && (
                        <button
                          type="button"
                          onClick={() => onOpenPaymentModal(expense)}
                          className="inline-flex items-center gap-1 rounded-xl bg-emerald-600 px-3 py-1.5 text-xs font-black text-white shadow-sm hover:bg-emerald-700 active:scale-95"
                          title="Efetuar pagamento desta conta"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Pagar
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleToggleMenu(expense, e)}
                        className={`rounded-xl border p-1.5 transition ${
                          menuTarget?.expense.id === expense.id
                            ? "border-orange-500 bg-orange-50 text-orange-600 dark:border-orange-500/50 dark:bg-orange-950/40 dark:text-orange-400"
                            : "border-slate-200 text-slate-400 hover:border-slate-300 hover:text-slate-600 dark:border-slate-700 dark:hover:text-slate-200"
                        }`}
                        title="Mais opções"
                      >
                        <MoreVertical className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Menu Flutuante Global (Livre de overflow da tabela) */}
      {menuTarget && (
        <>
          <div
            className="fixed inset-0 z-[998] bg-transparent"
            onClick={() => setMenuTarget(null)}
          />
          <div
            className="fixed z-[999] w-52 rounded-2xl border border-slate-200 bg-white p-1.5 shadow-2xl ring-1 ring-black/5 dark:border-slate-700 dark:bg-slate-800 dark:ring-white/5"
            style={{
              top: menuTarget.top,
              left: menuTarget.left,
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {menuTarget.expense.payments && menuTarget.expense.payments.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  const target = menuTarget.expense;
                  setMenuTarget(null);
                  onViewPayments(target);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Eye className="h-3.5 w-3.5 text-slate-400" />
                Ver histórico
              </button>
            )}

            {menuTarget.expense.status === "Paid" ? (
              <>
                <button
                  type="button"
                  onClick={() => {
                    const target = menuTarget.expense;
                    setMenuTarget(null);
                    onPrintReceipt(target);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
                >
                  <Printer className="h-3.5 w-3.5 text-slate-400" />
                  Imprimir recibo
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const target = menuTarget.expense;
                    setMenuTarget(null);
                    onOpenReversalModal(target);
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-amber-700 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  Estornar pagamento
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => {
                  const target = menuTarget.expense;
                  setMenuTarget(null);
                  onOpenEditModal(target);
                }}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-700"
              >
                <Edit2 className="h-3.5 w-3.5 text-slate-400" />
                Editar conta
              </button>
            )}

            {getPersonPhone(menuTarget.expense.personId) && (
              <a
                href={getWhatsAppUrl(
                  getPersonPhone(menuTarget.expense.personId)!,
                  menuTarget.expense
                )}
                target="_blank"
                rel="noreferrer"
                onClick={() => setMenuTarget(null)}
                className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-emerald-700 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/40"
              >
                <MessageCircle className="h-3.5 w-3.5" />
                WhatsApp do fornecedor
              </a>
            )}

            <div className="my-1 border-t border-slate-100 dark:border-slate-700" />

            <button
              type="button"
              onClick={() => {
                const target = menuTarget.expense;
                setMenuTarget(null);
                onOpenDeleteModal(target);
              }}
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              <Trash2 className="h-3.5 w-3.5" />
              Excluir conta
            </button>
          </div>
        </>
      )}
    </div>
  );
}
