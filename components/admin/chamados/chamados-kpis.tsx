"use client";

import React from "react";
import { MessageSquare, AlertCircle, CheckCircle2, Archive, Send } from "lucide-react";
import type { SupportTicket } from "@/services/chamados.service";
import type { TicketStatusFilter } from "./chamados-types";

interface ChamadosKpisProps {
  tickets: SupportTicket[];
  statusFilter: TicketStatusFilter;
  onSelectStatus: (status: TicketStatusFilter) => void;
}

export function ChamadosKpis({
  tickets,
  statusFilter,
  onSelectStatus,
}: ChamadosKpisProps) {
  const total = tickets.length;
  const abertos = tickets.filter((t) => t.status === "ABERTO").length;
  const respondidos = tickets.filter((t) => t.status === "RESPONDIDO").length;
  const fechados = tickets.filter((t) => t.status === "FECHADO").length;

  const kpis = [
    {
      id: "ALL" as TicketStatusFilter,
      label: "Total de Chamados",
      count: total,
      sublabel: "Histórico geral",
      icon: MessageSquare,
      badge: "Todos",
      colorClass: "text-slate-900 dark:text-white",
      bgClass: "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300",
      activeBorder: "border-slate-900 dark:border-white ring-2 ring-slate-900/10 dark:ring-white/10",
      hoverBorder: "hover:border-slate-400 dark:hover:border-slate-650",
    },
    {
      id: "ABERTO" as TicketStatusFilter,
      label: "Em Aberto",
      count: abertos,
      sublabel: "Aguardando resposta",
      icon: AlertCircle,
      badge: abertos > 0 ? "Requer Atenção" : "Em dia",
      pulse: abertos > 0,
      colorClass: "text-amber-600 dark:text-amber-400",
      bgClass: "bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400",
      activeBorder: "border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20 dark:bg-amber-950/20",
      hoverBorder: "hover:border-amber-300 dark:hover:border-amber-800",
    },
    {
      id: "RESPONDIDO" as TicketStatusFilter,
      label: "Respondidos",
      count: respondidos,
      sublabel: "Aguardando cliente",
      icon: Send,
      badge: "Em Andamento",
      colorClass: "text-blue-600 dark:text-blue-400",
      bgClass: "bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400",
      activeBorder: "border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20",
      hoverBorder: "hover:border-blue-300 dark:hover:border-blue-800",
    },
    {
      id: "FECHADO" as TicketStatusFilter,
      label: "Concluídos",
      count: fechados,
      sublabel: "Chamados encerrados",
      icon: CheckCircle2,
      badge: "Resolvidos",
      colorClass: "text-emerald-600 dark:text-emerald-400",
      bgClass: "bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400",
      activeBorder: "border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20 dark:bg-emerald-950/20",
      hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-800",
    },
  ];

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {kpis.map((kpi) => {
        const Icon = kpi.icon;
        const isActive = statusFilter === kpi.id;

        return (
          <button
            key={kpi.id}
            type="button"
            onClick={() => onSelectStatus(kpi.id)}
            className={`group relative flex flex-col justify-between rounded-3xl border bg-white p-5 text-left transition-all duration-200 dark:bg-slate-900 ${
              isActive
                ? kpi.activeBorder
                : `border-slate-200 dark:border-slate-800 ${kpi.hoverBorder} hover:shadow-md`
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                {kpi.label}
              </span>
              <div
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${kpi.bgClass}`}
              >
                <Icon className="h-4 w-4" />
              </div>
            </div>

            <div className="mt-4 flex items-baseline justify-between gap-2">
              <span className={`text-3xl font-black tracking-tight ${kpi.colorClass}`}>
                {kpi.count}
              </span>

              <div className="flex items-center gap-1.5">
                {kpi.pulse && (
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-500" />
                  </span>
                )}
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  {kpi.badge}
                </span>
              </div>
            </div>

            <p className="mt-1 text-[11px] font-semibold text-slate-400 dark:text-slate-500">
              {kpi.sublabel}
            </p>
          </button>
        );
      })}
    </div>
  );
}
