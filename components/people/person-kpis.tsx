"use client";

import React from "react";
import { UserRound, UserCheck, Building2, UserX, Users } from "lucide-react";
import type { Person, PersonStatusFilter, PersonTypeFilter } from "./person-types";

interface PersonKpisProps {
  people: Person[];
  statusFilter: PersonStatusFilter;
  typeFilter: PersonTypeFilter;
  onSelectStatusFilter: (status: PersonStatusFilter) => void;
  onSelectTypeFilter: (type: PersonTypeFilter) => void;
}

export function PersonKpis({
  people,
  statusFilter,
  typeFilter,
  onSelectStatusFilter,
  onSelectTypeFilter,
}: PersonKpisProps) {
  const total = people.length;
  const active = people.filter((p) => p.status === "active").length;
  const individual = people.filter((p) => p.type === "individual").length;
  const company = people.filter((p) => p.type === "company").length;
  const inactive = people.filter((p) => p.status === "inactive").length;

  const isTotalActive = statusFilter === "all" && typeFilter === "all";
  const isActiveSelected = statusFilter === "active" && typeFilter === "all";
  const isIndividualSelected = typeFilter === "individual";
  const isCompanySelected = typeFilter === "company";
  const isInactiveSelected = statusFilter === "inactive";

  const cards = [
    {
      id: "total",
      label: "Total Cadastrado",
      value: total,
      detail: "Base geral de contatos",
      icon: Users,
      colorClass: "text-slate-900",
      bgClass: "bg-slate-100",
      borderClass: "hover:border-slate-400",
      activeClass: "border-slate-900 ring-2 ring-slate-900/10",
      isSelected: isTotalActive,
      onClick: () => {
        onSelectStatusFilter("all");
        onSelectTypeFilter("all");
      },
    },
    {
      id: "active",
      label: "Pessoas Ativas",
      value: active,
      detail: "Disponíveis no sistema",
      icon: UserCheck,
      colorClass: "text-emerald-700",
      bgClass: "bg-emerald-50",
      borderClass: "hover:border-emerald-300",
      activeClass: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/40",
      isSelected: isActiveSelected,
      onClick: () => {
        onSelectStatusFilter("active");
        onSelectTypeFilter("all");
      },
    },
    {
      id: "individual",
      label: "Pessoa Física (PF)",
      value: individual,
      detail: "Clientes e inquilinos PF",
      icon: UserRound,
      colorClass: "text-blue-700",
      bgClass: "bg-blue-50",
      borderClass: "hover:border-blue-300",
      activeClass: "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/40",
      isSelected: isIndividualSelected,
      onClick: () => {
        onSelectTypeFilter("individual");
        onSelectStatusFilter("all");
      },
    },
    {
      id: "company",
      label: "Pessoa Jurídica (PJ)",
      value: company,
      detail: "Empresas e fornecedores",
      icon: Building2,
      colorClass: "text-amber-700",
      bgClass: "bg-amber-50",
      borderClass: "hover:border-amber-300",
      activeClass: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/40",
      isSelected: isCompanySelected,
      onClick: () => {
        onSelectTypeFilter("company");
        onSelectStatusFilter("all");
      },
    },
    {
      id: "inactive",
      label: "Inativos",
      value: inactive,
      detail: "Preservados p/ histórico",
      icon: UserX,
      colorClass: "text-slate-600",
      bgClass: "bg-slate-100",
      borderClass: "hover:border-slate-300",
      activeClass: "border-slate-500 ring-2 ring-slate-400/20 bg-slate-50",
      isSelected: isInactiveSelected,
      onClick: () => {
        onSelectStatusFilter("inactive");
        onSelectTypeFilter("all");
      },
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
              card.isSelected ? card.activeClass : "border-slate-200 hover:shadow-md"
            } ${card.borderClass}`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
                {card.label}
              </span>
              <div
                className={`flex h-8 w-8 items-center justify-center rounded-xl ${card.bgClass} ${card.colorClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-2">
              <div className="text-2xl font-black text-slate-900 tracking-tight">
                {card.value}
              </div>
              <p className="mt-0.5 text-xs font-semibold text-slate-400 truncate">
                {card.detail}
              </p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
