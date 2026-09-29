"use client";

import {
  CalendarDays,
  Eye,
  EyeOff,
  FileSpreadsheet,
  LayoutDashboard,
  RefreshCw,
} from "lucide-react";
import type { DashboardFinancialPeriod } from "@/types/dashboard.types";

type DashboardHeaderProps = {
  financialPeriod: DashboardFinancialPeriod;
  onPeriodChange: (period: DashboardFinancialPeriod) => void;
  customStartDate: string;
  onCustomStartDateChange: (date: string) => void;
  customEndDate: string;
  onCustomEndDateChange: (date: string) => void;
  lastUpdatedAt: Date | null;
  isLoading: boolean;
  onRefresh: () => void;
  onExportCSV: () => void;
  isPrivacyMode?: boolean;
  onTogglePrivacyMode?: () => void;
};

export function DashboardHeader({
  financialPeriod,
  onPeriodChange,
  customStartDate,
  onCustomStartDateChange,
  customEndDate,
  onCustomEndDateChange,
  lastUpdatedAt,
  isLoading,
  onRefresh,
  onExportCSV,
  isPrivacyMode = false,
  onTogglePrivacyMode,
}: DashboardHeaderProps) {
  return (
    <div className="space-y-5">
      {/* Top Header no Padrão Bens/Ativos */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-orange-500/10 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-3xl">
              Dashboard
            </h1>
            <p className="mt-0.5 text-xs sm:text-sm font-semibold text-slate-500 dark:text-slate-400">
              Visão geral e indicadores estratégicos de contratos, ocupação e bens/ativos
            </p>
          </div>
        </div>

        {/* Barra de Ações Rápidas no Padrão Bens/Ativos */}
        <div className="flex flex-wrap items-center gap-2">
          {onTogglePrivacyMode && (
            <button
              type="button"
              onClick={onTogglePrivacyMode}
              title={isPrivacyMode ? "Exibir valores monetários" : "Ocultar valores monetários (Modo Privacidade)"}
              className={`inline-flex h-11 items-center gap-2 rounded-2xl border px-3.5 text-xs font-black shadow-sm transition active:scale-95 ${
                isPrivacyMode
                  ? "border-orange-300 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-950/40 dark:text-orange-300"
                  : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
              }`}
            >
              {isPrivacyMode ? (
                <>
                  <EyeOff className="h-4 w-4 text-orange-600" />
                  <span>Modo Privado Ativo</span>
                </>
              ) : (
                <>
                  <Eye className="h-4 w-4" />
                  <span>Ocultar Valores</span>
                </>
              )}
            </button>
          )}

          <button
            type="button"
            onClick={onExportCSV}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200"
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Exportar CSV</span>
          </button>

          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            className="inline-flex h-11 items-center gap-2 rounded-2xl bg-orange-600 px-4 text-xs font-black text-white shadow-lg shadow-orange-200 transition hover:bg-orange-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 dark:shadow-none"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            <span>{isLoading ? "Atualizando..." : "Atualizar"}</span>
          </button>
        </div>
      </div>

      {/* Card de Filtros no Padrão AssetFilters */}
      <div className="rounded-3xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid gap-3.5 sm:grid-cols-2 lg:grid-cols-4 items-end">
          <div>
            <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
              Período de Análise
            </label>
            <select
              value={financialPeriod}
              onChange={(event) =>
                onPeriodChange(event.target.value as DashboardFinancialPeriod)
              }
              className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
              aria-label="Período financeiro da Dashboard"
            >
              <option value="CurrentMonth">Mês atual</option>
              <option value="CurrentYear">Ano atual</option>
              <option value="All">Todo o período</option>
              <option value="Custom">Personalizado</option>
            </select>
          </div>

          {financialPeriod === "Custom" ? (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Data Inicial
                </label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => onCustomStartDateChange(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-black uppercase tracking-wider text-slate-600 dark:text-slate-300">
                  Data Final
                </label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => onCustomEndDateChange(e.target.value)}
                  className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white"
                />
              </div>
            </>
          ) : (
            <div className="sm:col-span-2 flex items-center gap-2">
              <span className="inline-flex h-11 items-center gap-2 rounded-2xl border border-slate-100 bg-slate-50/80 px-4 text-xs font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-400">
                <CalendarDays className="h-4 w-4 text-orange-500" />
                Data de referência: {new Date().toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}

          <div className="flex items-center justify-end">
            {lastUpdatedAt && (
              <p className="text-right text-[11px] font-bold text-slate-400 dark:text-slate-500">
                Sincronizado às{" "}
                <span className="font-black text-orange-600 dark:text-orange-400">
                  {lastUpdatedAt.toLocaleTimeString("pt-BR", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </span>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
