"use client";

import React from "react";
import {
  Charge,
  StatusFilter,
  formatCurrency,
} from "./receivable-types";
import {
  ArrowUpCircle,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Wallet,
} from "lucide-react";

interface ReceivableKpisProps {
  charges: Charge[];
  selectedFilter: StatusFilter;
  onSelectFilter: (filter: StatusFilter) => void;
  getChargeRemainingAmount: (charge: Charge) => number;
  getChargePaidAmount: (charge: Charge) => number;
}

export function ReceivableKpis({
  charges,
  selectedFilter,
  onSelectFilter,
  getChargeRemainingAmount,
  getChargePaidAmount,
}: ReceivableKpisProps) {
  const totalCount = charges.length;
  const totalAmount = charges.reduce((sum, c) => sum + Number(c.amount || 0), 0);

  const pendingCharges = charges.filter((c) => c.status === "Pending");
  const pendingAmount = pendingCharges.reduce(
    (sum, c) => sum + getChargeRemainingAmount(c),
    0
  );

  const paidCharges = charges.filter((c) => c.status === "Paid");
  const paidAmount = paidCharges.reduce(
    (sum, c) => sum + getChargePaidAmount(c),
    0
  );

  const overdueCharges = charges.filter((c) => c.status === "Overdue");
  const overdueAmount = overdueCharges.reduce(
    (sum, c) => sum + getChargeRemainingAmount(c),
    0
  );

  const totalRemaining = charges
    .filter((c) => c.status !== "Paid")
    .reduce((sum, c) => sum + getChargeRemainingAmount(c), 0);

  const cards = [
    {
      label: "Total de Cobranças",
      count: totalCount,
      amount: totalAmount,
      filter: "All" as StatusFilter,
      icon: ArrowUpCircle,
      colorClass: "text-slate-900 dark:text-white",
      bgClass: "bg-slate-100 dark:bg-slate-800",
      borderClass: "hover:border-slate-400 dark:hover:border-slate-600",
      activeClass: "border-slate-900 ring-2 ring-slate-900/10 dark:border-white dark:ring-white/10",
    },
    {
      label: "Em Aberto / No Prazo",
      count: pendingCharges.length,
      amount: pendingAmount,
      filter: "Pending" as StatusFilter,
      icon: Clock,
      colorClass: "text-amber-700 dark:text-amber-400",
      bgClass: "bg-amber-50 dark:bg-amber-950/40",
      borderClass: "hover:border-amber-300 dark:hover:border-amber-700",
      activeClass: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40 dark:bg-amber-950/20",
    },
    {
      label: "Vencidas / Em Atraso",
      count: overdueCharges.length,
      amount: overdueAmount,
      filter: "Overdue" as StatusFilter,
      icon: AlertTriangle,
      colorClass: "text-red-700 dark:text-red-400",
      bgClass: "bg-red-50 dark:bg-red-950/40",
      borderClass: "hover:border-red-300 dark:hover:border-red-700",
      activeClass: "border-red-500 ring-2 ring-red-500/20 bg-red-50/40 dark:bg-red-950/20",
    },
    {
      label: "Recebidas / Quitadas",
      count: paidCharges.length,
      amount: paidAmount,
      filter: "Paid" as StatusFilter,
      icon: CheckCircle2,
      colorClass: "text-emerald-700 dark:text-emerald-400",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
      borderClass: "hover:border-emerald-300 dark:hover:border-emerald-700",
      activeClass: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20",
    },
    {
      label: "Saldo Total a Receber",
      count: pendingCharges.length + overdueCharges.length,
      amount: totalRemaining,
      filter: "All" as StatusFilter,
      icon: Wallet,
      colorClass: "text-emerald-700 dark:text-emerald-400",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/40",
      borderClass: "hover:border-emerald-300 dark:hover:border-emerald-700",
      activeClass: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40 dark:bg-emerald-950/20",
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
                {card.count} {card.count === 1 ? "cobrança" : "cobranças"}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
