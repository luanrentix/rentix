"use client";

import React from "react";
import { Search, X, Filter, ArrowUpDown, RotateCcw, List, LayoutGrid } from "lucide-react";
import type { TicketStatusFilter, TicketSortOption } from "./suporte-types";

interface SuporteFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TicketStatusFilter;
  onStatusFilterChange: (status: TicketStatusFilter) => void;
  sortOption: TicketSortOption;
  onSortOptionChange: (sort: TicketSortOption) => void;
  totalFiltered: number;
  totalAll: number;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  viewMode: "table" | "cards";
  onViewModeChange: (mode: "table" | "cards") => void;
}

export function SuporteFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  sortOption,
  onSortOptionChange,
  totalFiltered,
  totalAll,
  onResetFilters,
  hasActiveFilters,
  viewMode,
  onViewModeChange,
}: SuporteFiltersProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Barra de Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por assunto, dúvida ou conteúdo da mensagem..."
            className="w-full rounded-2xl border border-slate-200 bg-slate-50/70 py-2.5 pl-10 pr-10 text-xs font-bold text-slate-800 outline-none transition focus:border-indigo-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800/60 dark:text-white dark:focus:border-indigo-400"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Controles de Filtros e Ordenação */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Filtro por Status */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800/60">
            <Filter className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as TicketStatusFilter)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none dark:text-slate-200 cursor-pointer"
            >
              <option value="ALL">Todos os Status</option>
              <option value="ABERTO">Em Aberto</option>
              <option value="RESPONDIDO">Respondidos</option>
              <option value="FECHADO">Resolvidos</option>
            </select>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800/60">
            <ArrowUpDown className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={sortOption}
              onChange={(e) => onSortOptionChange(e.target.value as TicketSortOption)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none dark:text-slate-200 cursor-pointer"
            >
              <option value="recent">Mais Recentes</option>
              <option value="waiting_first">Abertos Primeiro</option>
              <option value="oldest">Mais Antigos</option>
            </select>
          </div>

          {/* Alternância Tabela vs Cards (Padrão Bens/Ativos) */}
          <div className="hidden sm:flex items-center rounded-2xl border border-slate-200 bg-slate-100 p-1 dark:border-slate-700 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => onViewModeChange("table")}
              className={`rounded-xl p-1.5 transition ${
                viewMode === "table"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
              title="Visualização em Tabela"
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange("cards")}
              className={`rounded-xl p-1.5 transition ${
                viewMode === "cards"
                  ? "bg-white text-indigo-600 shadow-sm dark:bg-slate-700 dark:text-white"
                  : "text-slate-500 hover:text-slate-700 dark:text-slate-400"
              }`}
              title="Visualização em Cards"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>

          {/* Botão Limpar Filtros */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 rounded-2xl border border-dashed border-slate-300 px-3 py-2 text-xs font-bold text-slate-500 hover:border-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800"
              title="Restaurar filtros originais"
            >
              <RotateCcw className="h-3 w-3" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Barra de Status e Contagem */}
      <div className="flex items-center justify-between border-t border-slate-100 pt-3 text-xs font-semibold text-slate-400 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <span>
            Exibindo <strong className="text-slate-700 dark:text-slate-200 font-black">{totalFiltered}</strong> de{" "}
            {totalAll} chamado(s)
          </span>
          {hasActiveFilters && (
            <span className="rounded-md bg-indigo-50 px-1.5 py-0.5 text-[10px] font-bold text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400">
              Filtro ativo
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
