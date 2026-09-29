"use client";

import React from "react";
import { UsersRound, Building2, Clock3, AlertTriangle, Bug } from "lucide-react";
import type { AdminSummary, AdminCompany, AdminTab, DueFilter, CommercialFilter } from "./admin-types";
import { getOperationalCompanyRecords, getTrialDaysRemaining } from "./admin-types";

interface AdminKpisProps {
  summary: AdminSummary | null;
  companies: AdminCompany[];
  totalCriticalErrors24h: number;
  activeTab: AdminTab;
  commercialFilter: CommercialFilter;
  dueFilter: DueFilter;
  onSelectMetric: (tab: AdminTab, commercial?: CommercialFilter, due?: DueFilter) => void;
}

export function AdminKpis({
  summary,
  companies,
  totalCriticalErrors24h,
  activeTab,
  commercialFilter,
  dueFilter,
  onSelectMetric,
}: AdminKpisProps) {
  const totalUsers = summary?.totalUsers ?? 0;

  const operationalCompanies = companies.filter(
    (c) => getOperationalCompanyRecords(c) > 0,
  );
  const activeOperationalCount = operationalCompanies.filter((c) => c.isActive).length;

  const trialCount = companies.filter(
    (c) => c.isActive && c.subscriptionStatus === "TRIAL",
  ).length;

  const expiringCount = companies.filter((c) => {
    if (!c.isActive) return false;
    const days = getTrialDaysRemaining(c);
    return days !== null && days <= 3;
  }).length;

  const cards = [
    {
      id: "users",
      label: "Total de Usuários",
      value: totalUsers,
      sublabel: `${summary?.activeUsers ?? 0} ativos`,
      icon: UsersRound,
      colorClass: "text-slate-900",
      bgClass: "bg-slate-100",
      borderClass: "hover:border-slate-400",
      activeClass: "border-slate-900 ring-2 ring-slate-900/10",
      isActive: activeTab === "usuarios" && commercialFilter === "all" && dueFilter === "all",
      onClick: () => onSelectMetric("usuarios", "all", "all"),
    },
    {
      id: "companies",
      label: "Empresas Ativas",
      value: activeOperationalCount,
      sublabel: "Com dados reais",
      icon: Building2,
      colorClass: "text-orange-600",
      bgClass: "bg-orange-50",
      borderClass: "hover:border-orange-300",
      activeClass: "border-orange-500 ring-2 ring-orange-500/20 bg-orange-50/40",
      isActive: activeTab === "empresas" && commercialFilter === "all" && dueFilter === "all",
      onClick: () => onSelectMetric("empresas", "all", "all"),
    },
    {
      id: "trial",
      label: "Em Teste (Trial)",
      value: trialCount,
      sublabel: "Avaliando plataforma",
      icon: Clock3,
      colorClass: "text-blue-700",
      bgClass: "bg-blue-50",
      borderClass: "hover:border-blue-300",
      activeClass: "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40",
      isActive: activeTab === "empresas" && commercialFilter === "TRIAL",
      onClick: () => onSelectMetric("empresas", "TRIAL", "all"),
    },
    {
      id: "due",
      label: "Vencimento <= 3d",
      value: expiringCount,
      sublabel: "Atenção comercial",
      icon: AlertTriangle,
      colorClass: "text-amber-700",
      bgClass: "bg-amber-50",
      borderClass: "hover:border-amber-300",
      activeClass: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40",
      isActive: activeTab === "empresas" && dueFilter === "threeDays",
      onClick: () => onSelectMetric("empresas", "all", "threeDays"),
    },
    {
      id: "errors",
      label: "Falhas do Servidor (24h)",
      value: totalCriticalErrors24h,
      sublabel: "Ocorrências técnicas",
      icon: Bug,
      colorClass: "text-red-700",
      bgClass: "bg-red-50",
      borderClass: "hover:border-red-300",
      activeClass: "border-red-500 ring-2 ring-red-500/20 bg-red-50/40",
      isActive: activeTab === "logs",
      onClick: () => onSelectMetric("logs"),
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <button
            key={card.id}
            type="button"
            onClick={card.onClick}
            className={`group flex flex-col justify-between rounded-2xl border bg-white p-4 text-left transition-all duration-200 ${
              card.isActive ? card.activeClass : "border-slate-200 hover:shadow-md"
            } ${card.borderClass}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 truncate mr-2">
                {card.label}
              </span>
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${card.bgClass} ${card.colorClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-1">
              <span className={`text-2xl font-black ${card.colorClass}`}>
                {card.value}
              </span>
              <span className="text-[10px] font-bold text-slate-400 truncate">
                {card.sublabel}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
