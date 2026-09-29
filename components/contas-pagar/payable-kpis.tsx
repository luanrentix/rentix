"use client";

import React from "react";
import {
  Expense,
  ExpenseFilterStatus,
  formatCurrency,
} from "./payable-types";
import {
  ArrowDownCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
} from "lucide-react";

interface PayableKpisProps {
  expenses: Expense[];
  selectedFilter: ExpenseFilterStatus;
  onSelectFilter: (filter: ExpenseFilterStatus) => void;
  getExpenseRemainingAmount: (expense: Expense) => number;
  getExpensePaidAmount: (expense: Expense) => number;
}

export function PayableKpis({
  expenses,
  selectedFilter,
  onSelectFilter,
  getExpenseRemainingAmount,
  getExpensePaidAmount,
}: PayableKpisProps) {
  const totalCount = expenses.length;
  const totalAmount = expenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const pendingExpenses = expenses.filter((e) => e.status === "Pending");
  const pendingAmount = pendingExpenses.reduce(
    (sum, e) => sum + getExpenseRemainingAmount(e),
    0
  );

  const paidExpenses = expenses.filter((e) => e.status === "Paid");
  const paidAmount = paidExpenses.reduce(
    (sum, e) => sum + getExpensePaidAmount(e),
    0
  );

  const overdueExpenses = expenses.filter((e) => e.status === "Overdue");
  const overdueAmount = overdueExpenses.reduce(
    (sum, e) => sum + getExpenseRemainingAmount(e),
    0
  );

  const totalRemaining = expenses
    .filter((e) => e.status !== "Paid")
    .reduce((sum, e) => sum + getExpenseRemainingAmount(e), 0);

  const cards = [
    {
      label: "Total a Pagar",
      count: totalCount,
      amount: totalAmount,
      filter: "All" as ExpenseFilterStatus,
      icon: ArrowDownCircle,
      colorClass: "text-slate-900 dark:text-white",
      bgClass: "bg-slate-100 dark:bg-slate-800",
      borderClass: "hover:border-slate-400 dark:hover:border-slate-600",
      activeClass: "border-slate-900 ring-2 ring-slate-900/10 dark:border-white dark:ring-white/10",
    },
    {
      label: "Em Aberto / No Prazo",
      count: pendingExpenses.length,
      amount: pendingAmount,
      filter: "Pending" as ExpenseFilterStatus,
      icon: Clock,
      colorClass: "text-amber-700 dark:text-amber-400",
      bgClass: "bg-amber-50 dark:bg-amber-950/40",
      borderClass: "hover:border-amber-300 dark:hover:border-amber-700",
      activeClass: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20",
    },
    {
      label: "Vencidas / Em Atraso",
      count: overdueExpenses.length,
      amount: overdueAmount,
      filter: "Overdue" as ExpenseFilterStatus,
      icon: AlertTriangle,
      colorClass: "text-red-700 dark:text-red-400",
      bgClass: "bg-red-50 dark:bg-red-950/40",
      borderClass: "hover:border-red-300 dark:hover:border-red-700",
      activeClass: "border-red-500 ring-2 ring-red-500/20 bg-red-50/40 dark:bg-red-950/20",
    },
    {
      label: "Pagas / Liquidadas",
      count: paidExpenses.length,
      amount: paidAmount,
      filter: "Paid" as ExpenseFilterStatus,
      icon: CheckCircle2,
      colorClass: "text-emerald-700 dark:text-emerald-400",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
      borderClass: "hover:border-emerald-300 dark:hover:border-emerald-700",
      activeClass: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20",
    },
    {
      label: "Saldo Devedor Restante",
      count: pendingExpenses.length + overdueExpenses.length,
      amount: totalRemaining,
      filter: "All" as ExpenseFilterStatus,
      icon: Wallet,
      colorClass: "text-indigo-700 dark:text-indigo-400",
      bgClass: "bg-indigo-50 dark:bg-indigo-950/40",
      borderClass: "hover:border-indigo-300 dark:hover:border-indigo-700",
      activeClass: "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-50/40 dark:bg-indigo-950/20",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedFilter === card.filter;

        return (
          <button
            key={card.label}
            type="button"
            onClick={() => onSelectFilter(card.filter)}
            className={`group flex flex-col justify-between rounded-2xl border bg-white p-4 text-left transition-all duration-200 dark:bg-slate-900 ${
              isSelected
                ? card.activeClass
                : "border-slate-200 hover:shadow-md dark:border-slate-800"
            } ${card.borderClass}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {card.label}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.bgClass} ${card.colorClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className={`text-xl font-black sm:text-2xl ${card.colorClass}`}>
                {formatCurrency(card.amount)}
              </div>
              <p className="mt-0.5 text-xs font-bold text-slate-400 dark:text-slate-500">
                {card.count} {card.count === 1 ? "conta" : "contas"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
