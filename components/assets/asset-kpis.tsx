"use client";

import React from "react";
import { Property, PropertyOperationalFilterStatus } from "./asset-types";
import { Building2, CheckCircle2, KeyRound, Wrench, AlertTriangle } from "lucide-react";

interface AssetKpisProps {
  properties: Property[];
  selectedFilter: PropertyOperationalFilterStatus;
  onSelectFilter: (filter: PropertyOperationalFilterStatus) => void;
}

export function AssetKpis({
  properties,
  selectedFilter,
  onSelectFilter,
}: AssetKpisProps) {
  const total = properties.length;
  const available = properties.filter(
    (p) => p.isActive && p.operationalStatus === "AVAILABLE"
  ).length;
  const rented = properties.filter(
    (p) => p.isActive && p.operationalStatus === "RENTED"
  ).length;
  const maintenance = properties.filter(
    (p) => p.isActive && p.operationalStatus === "MAINTENANCE"
  ).length;
  const inactives = properties.filter((p) => !p.isActive).length;

  const cards = [
    {
      label: "Total de Bens/Ativos",
      value: total,
      filter: "All" as PropertyOperationalFilterStatus,
      icon: Building2,
      colorClass: "text-slate-900",
      bgClass: "bg-slate-100",
      borderClass: "hover:border-slate-400",
      activeClass: "border-slate-900 ring-2 ring-slate-900/10",
    },
    {
      label: "Disponíveis",
      value: available,
      filter: "AVAILABLE" as PropertyOperationalFilterStatus,
      icon: CheckCircle2,
      colorClass: "text-emerald-700",
      bgClass: "bg-emerald-50",
      borderClass: "hover:border-emerald-300",
      activeClass: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40",
    },
    {
      label: "Alugados",
      value: rented,
      filter: "RENTED" as PropertyOperationalFilterStatus,
      icon: KeyRound,
      colorClass: "text-blue-700",
      bgClass: "bg-blue-50",
      borderClass: "hover:border-blue-300",
      activeClass: "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40",
    },
    {
      label: "Em Manutenção",
      value: maintenance,
      filter: "MAINTENANCE" as PropertyOperationalFilterStatus,
      icon: Wrench,
      colorClass: "text-amber-700",
      bgClass: "bg-amber-50",
      borderClass: "hover:border-amber-300",
      activeClass: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40",
    },
    {
      label: "Inativos / Baixados",
      value: inactives,
      filter: "INACTIVE" as PropertyOperationalFilterStatus,
      icon: AlertTriangle,
      colorClass: "text-slate-600",
      bgClass: "bg-slate-100",
      borderClass: "hover:border-slate-300",
      activeClass: "border-slate-500 ring-2 ring-slate-400/20 bg-slate-50",
    },
  ];

  return (
    <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;
        const isSelected = selectedFilter === card.filter;

        return (
          <button
            key={card.label}
            type="button"
            onClick={() => onSelectFilter(card.filter)}
            className={`group flex min-w-0 flex-col justify-between rounded-2xl border bg-white p-3.5 sm:p-4 text-left transition-all duration-200 ${
              isSelected ? card.activeClass : "border-slate-200 hover:shadow-md"
            } ${card.borderClass}`}
          >
            <div className="flex items-center justify-between gap-1">
              <span className="truncate text-[11px] font-black uppercase tracking-wider text-slate-500">
                {card.label}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.bgClass} ${card.colorClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>
            <div className="mt-3">
              <span className={`text-2xl font-black ${card.colorClass}`}>
                {card.value}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}
