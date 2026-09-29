"use client";

import React from "react";
import { Search, X, Filter, Building2, ArrowUpDown, RotateCcw } from "lucide-react";
import type { AdminCompany } from "@/services/admin.service";
import type { TicketStatusFilter, TicketSortOption } from "./chamados-types";

interface ChamadosFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: TicketStatusFilter;
  onStatusFilterChange: (status: TicketStatusFilter) => void;
  selectedCompanyId: string;
  onCompanyChange: (companyId: string) => void;
  sortOption: TicketSortOption;
  onSortOptionChange: (sort: TicketSortOption) => void;
  companies: AdminCompany[];
  totalFiltered: number;
  totalAll: number;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
}

export function ChamadosFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  selectedCompanyId,
  onCompanyChange,
  sortOption,
  onSortOptionChange,
  companies,
  totalFiltered,
  totalAll,
  onResetFilters,
  hasActiveFilters,
}: ChamadosFiltersProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900 space-y-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        {/* Barra de Busca */}
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Buscar por assunto, mensagem, solicitante, email ou empresa..."
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
          {/* Filtro por Empresa */}
          <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-50/70 px-3 py-1.5 dark:border-slate-700 dark:bg-slate-800/60">
            <Building2 className="h-3.5 w-3.5 text-slate-400" />
            <select
              value={selectedCompanyId}
              onChange={(e) => onCompanyChange(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none dark:text-slate-200 cursor-pointer"
            >
              <option value="all">Todas as Empresas</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.tradeName || c.companyName}
                </option>
              ))}
            </select>
          </div>

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
              <option value="FECHADO">Concluídos</option>
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
