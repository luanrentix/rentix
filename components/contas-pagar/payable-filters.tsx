"use client";

import React from "react";
import { Search, Calendar, Filter, X, LayoutGrid, List, User } from "lucide-react";
import {
  ExpenseFilterStatus,
  ExpensePeriodShortcut,
  EXPENSE_CATEGORIES,
  Tenant,
  Property,
} from "./payable-types";

interface PayableFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ExpenseFilterStatus;
  onStatusFilterChange: (value: ExpenseFilterStatus) => void;
  categoryFilter: string;
  onCategoryFilterChange: (value: string) => void;
  selectedPersonId: string;
  onPersonChange: (value: string) => void;
  selectedPropertyId: string;
  onPropertyChange: (value: string) => void;
  periodShortcut: ExpensePeriodShortcut;
  onPeriodShortcutChange: (value: ExpensePeriodShortcut) => void;
  startDate: string;
  onStartDateChange: (value: string) => void;
  endDate: string;
  onEndDateChange: (value: string) => void;
  people: Tenant[];
  properties: Property[];
  viewMode: "table" | "cards";
  onViewModeChange: (mode: "table" | "cards") => void;
  onResetFilters: () => void;
  hasActiveFilters: boolean;
  onOpenPersonSelectModal?: () => void;
}

export function PayableFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  categoryFilter,
  onCategoryFilterChange,
  selectedPersonId,
  onPersonChange,
  selectedPropertyId,
  onPropertyChange,
  periodShortcut,
  onPeriodShortcutChange,
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  people,
  properties,
  viewMode,
  onViewModeChange,
  onResetFilters,
  hasActiveFilters,
  onOpenPersonSelectModal,
}: PayableFiltersProps) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-4">
        {/* Linha superior: Busca e Períodos Rápidos */}
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-3.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Buscar por descrição, fornecedor, observação, categoria..."
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 py-3 pl-11 pr-4 text-sm font-semibold text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-red-500 focus:bg-white focus:ring-2 focus:ring-red-100 dark:border-slate-700 dark:bg-slate-800 dark:text-white dark:focus:border-red-400 dark:focus:ring-red-950"
            />
            {search && (
              <button
                type="button"
                onClick={() => onSearchChange("")}
                className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0">
            <span className="text-xs font-bold text-slate-400 dark:text-slate-500">
              Período:
            </span>
            {(
              [
                { label: "Mês Atual", value: "CurrentMonth" },
                { label: "Trimestre", value: "CurrentQuarter" },
                { label: "Ano Atual", value: "CurrentYear" },
                { label: "Todos", value: "All" },
              ] as const
            ).map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => onPeriodShortcutChange(item.value)}
                className={`rounded-xl px-3 py-2 text-xs font-black transition ${
                  periodShortcut === item.value
                    ? "bg-red-50 text-red-700 ring-1 ring-red-200 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                }`}
              >
                {item.label}
              </button>
            ))}

            <div className="ml-2 flex items-center rounded-2xl border border-slate-200 p-1 dark:border-slate-800">
              <button
                type="button"
                onClick={() => onViewModeChange("table")}
                className={`rounded-xl p-1.5 transition ${
                  viewMode === "table"
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                title="Visualização em tabela"
              >
                <List className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onViewModeChange("cards")}
                className={`rounded-xl p-1.5 transition ${
                  viewMode === "cards"
                    ? "bg-slate-200 text-slate-900 dark:bg-slate-700 dark:text-white"
                    : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
                }`}
                title="Visualização em cartões"
              >
                <LayoutGrid className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Linha inferior: Filtros dropdown detalhados */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Situação
            </label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value as ExpenseFilterStatus)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition focus:border-red-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="All">Todas as situações</option>
              <option value="Pending">Em Aberto / No Prazo</option>
              <option value="Overdue">Vencidas</option>
              <option value="Paid">Pagas</option>
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Fornecedor / Pessoa
            </label>
            <div className="relative">
              <button
                type="button"
                onClick={onOpenPersonSelectModal}
                className="flex h-[42px] w-full items-center justify-between rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-left text-xs font-bold text-slate-700 outline-none transition hover:border-red-500 hover:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <User className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <span className="truncate">
                    {selectedPersonId && selectedPersonId !== "all"
                      ? people.find((p) => p.id === selectedPersonId)?.name || "Pessoa selecionada"
                      : "Todas as Pessoas / Fornecedores"}
                  </span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {selectedPersonId && selectedPersonId !== "all" && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        onPersonChange("all");
                      }}
                      className="rounded-lg p-0.5 text-slate-400 hover:bg-slate-200 hover:text-slate-700 dark:hover:bg-slate-700"
                      title="Remover filtro de fornecedor"
                    >
                      <X className="h-3.5 w-3.5" />
                    </span>
                  )}
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                </div>
              </button>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Bem / Ativo Vinculado
            </label>
            <select
              value={selectedPropertyId}
              onChange={(e) => onPropertyChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition focus:border-red-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Todos os bens/imóveis</option>
              <option value="none">Sem bem vinculado</option>
              {properties.map((prop) => (
                <option key={prop.id} value={prop.id}>
                  {prop.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Categoria
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50/50 px-3 py-2.5 text-xs font-bold text-slate-700 outline-none transition focus:border-red-500 focus:bg-white dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
              <option value="all">Todas as categorias</option>
              {EXPENSE_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end gap-2">
            <div className="flex-1">
              <label className="mb-1 block text-[11px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Data Inicial / Final
              </label>
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    onStartDateChange(e.target.value);
                    onPeriodShortcutChange("Custom");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-2 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    onEndDateChange(e.target.value);
                    onPeriodShortcutChange("Custom");
                  }}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-2 py-2 text-xs font-semibold text-slate-700 outline-none dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
                />
              </div>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={onResetFilters}
                className="inline-flex h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 px-3 text-xs font-bold text-slate-600 hover:bg-slate-200 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
                title="Limpar todos os filtros"
              >
                <X className="h-3.5 w-3.5" />
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
