"use client";

import React from "react";
import {
  Contract,
  ContractFilterStatus,
  formatCurrency,
  getDisplayContractStatus,
} from "./contract-types";
import {
  FileText,
  CheckCircle2,
  Clock,
  AlertTriangle,
  CheckCircle,
  DollarSign,
} from "lucide-react";

interface ContractKpisProps {
  contracts: Contract[];
  selectedFilter: ContractFilterStatus;
  onSelectFilter: (filter: ContractFilterStatus) => void;
}

export function ContractKpis({
  contracts,
  selectedFilter,
  onSelectFilter,
}: ContractKpisProps) {
  const total = contracts.length;

  const active = contracts.filter((c) =>
    ["Active", "Expiring", "Scheduled"].includes(getDisplayContractStatus(c))
  ).length;

  const expiring = contracts.filter(
    (c) => getDisplayContractStatus(c) === "Expiring"
  ).length;

  const expired = contracts.filter(
    (c) => getDisplayContractStatus(c) === "Expired"
  ).length;

  const finished = contracts.filter(
    (c) => getDisplayContractStatus(c) === "Finished"
  ).length;

  // Receita Mensal Contratada (apenas contratos ativos, agendados e a vencer)
  const monthlyRevenue = contracts
    .filter((c) => ["Active", "Expiring", "Scheduled"].includes(getDisplayContractStatus(c)))
    .reduce((sum, c) => sum + (Number(c.rentValue) || 0), 0);

  const cards = [
    {
      label: "Total de Contratos",
      value: total,
      filter: "All" as ContractFilterStatus,
      icon: FileText,
      colorClass: "text-slate-900",
      bgClass: "bg-slate-100",
      borderClass: "hover:border-slate-400",
      activeClass: "border-slate-900 ring-2 ring-slate-900/10",
      isMoney: false,
    },
    {
      label: "Ativos",
      value: active,
      filter: "Active" as ContractFilterStatus,
      icon: CheckCircle2,
      colorClass: "text-emerald-700",
      bgClass: "bg-emerald-50",
      borderClass: "hover:border-emerald-300",
      activeClass: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40",
      isMoney: false,
    },
    {
      label: "A Vencer (30d)",
      value: expiring,
      filter: "Expiring" as ContractFilterStatus,
      icon: Clock,
      colorClass: "text-amber-700",
      bgClass: "bg-amber-50",
      borderClass: "hover:border-amber-300",
      activeClass: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40",
      isMoney: false,
    },
    {
      label: "Vencidos",
      value: expired,
      filter: "Expired" as ContractFilterStatus,
      icon: AlertTriangle,
      colorClass: "text-rose-700",
      bgClass: "bg-rose-50",
      borderClass: "hover:border-rose-300",
      activeClass: "border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/40",
      isMoney: false,
    },
    {
      label: "Finalizados",
      value: finished,
      filter: "Finished" as ContractFilterStatus,
      icon: CheckCircle,
      colorClass: "text-blue-700",
      bgClass: "bg-blue-50",
      borderClass: "hover:border-blue-300",
      activeClass: "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40",
      isMoney: false,
    },
    {
      label: "Receita Ativa / Mês",
      value: monthlyRevenue,
      filter: null, // Card informativo
      icon: DollarSign,
      colorClass: "text-orange-700",
      bgClass: "bg-orange-50",
      borderClass: "hover:border-orange-300",
      activeClass: "",
      isMoney: true,
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      {cards.map((card) => {
        const Icon = card.icon;
        const isClickable = card.filter !== null;
        const isSelected = isClickable && selectedFilter === card.filter;

        const Component = isClickable ? "button" : "div";

        return (
          <Component
            key={card.label}
            {...(isClickable ? { type: "button", onClick: () => card.filter && onSelectFilter(card.filter) } : {})}
            className={`group flex flex-col justify-between rounded-2xl border bg-white p-4 text-left transition-all duration-200 ${
              isSelected ? card.activeClass : "border-slate-200 hover:shadow-md"
            } ${card.borderClass} ${isClickable ? "cursor-pointer" : ""}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {card.label}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl transition ${card.bgClass} ${card.colorClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-3">
              <span className={`text-xl font-black tracking-tight ${card.colorClass}`}>
                {card.isMoney ? formatCurrency(card.value) : card.value}
              </span>
              {isClickable && (
                <span className="block text-[10px] font-semibold text-slate-400 group-hover:text-orange-600 transition">
                  {isSelected ? "● Filtro aplicado" : "Clique para filtrar"}
                </span>
              )}
            </div>
          </Component>
        );
      })}
    </div>
  );
}
