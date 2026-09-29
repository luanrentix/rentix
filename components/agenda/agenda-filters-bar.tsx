"use client";

import type { ReactNode } from "react";
import { Search } from "lucide-react";
import type { SchedulePriority, ScheduleStatus } from "./agenda.types";

type AgendaFiltersBarProps = {
  searchTerm: string;
  setSearchTerm: (value: string) => void;
  statusFilter: ScheduleStatus | "all";
  setStatusFilter: (value: ScheduleStatus | "all") => void;
  typeFilter: string;
  setTypeFilter: (value: string) => void;
  responsibleFilter: string;
  setResponsibleFilter: (value: string) => void;
  priorityFilter: SchedulePriority | "all";
  setPriorityFilter: (value: SchedulePriority | "all") => void;
  uniqueTypeOptions: string[];
  uniqueResponsibleOptions: string[];
  activeFilterCount: number;
  filteredCount: number;
  onClearFilters: () => void;
  isBlackTheme: boolean;
};

export function AgendaFiltersBar({
  searchTerm,
  setSearchTerm,
  statusFilter,
  setStatusFilter,
  typeFilter,
  setTypeFilter,
  responsibleFilter,
  setResponsibleFilter,
  priorityFilter,
  setPriorityFilter,
  uniqueTypeOptions,
  uniqueResponsibleOptions,
  activeFilterCount,
  filteredCount,
  onClearFilters,
  isBlackTheme,
}: AgendaFiltersBarProps) {
  const cardClass = isBlackTheme
    ? "border-[#334155] bg-[#0f172a]"
    : "border-[#e2e8f0] bg-[#ffffff]";
  const strongTextClass = isBlackTheme ? "text-[#f8fafc]" : "text-[#0f172a]";
  const mutedTextClass = isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]";
  const inputClass = isBlackTheme
    ? "w-full rounded-xl border border-[#334155] bg-[#020617] px-4 py-3 text-sm font-semibold text-[#f8fafc] placeholder-[#64748b] transition focus:border-orange-500 focus:outline-none"
    : "w-full rounded-xl border border-[#cbd5e1] bg-[#f8fafc] px-4 py-3 text-sm font-semibold text-[#0f172a] placeholder-[#94a3b8] transition focus:border-orange-500 focus:bg-[#ffffff] focus:outline-none";
  const secondaryButtonClass = isBlackTheme
    ? "inline-flex items-center gap-2 rounded-xl border border-[#334155] bg-[#020617] px-4 py-3 text-sm font-bold text-[#f8fafc] transition hover:border-[#475569] hover:bg-[#0f172a]"
    : "inline-flex items-center gap-2 rounded-xl border border-[#e2e8f0] bg-[#ffffff] px-4 py-3 text-sm font-bold text-[#0f172a] shadow-sm transition hover:bg-[#f8fafc]";

  const getStatusFilterLabel = (status: ScheduleStatus | "all") => {
    if (status === "scheduled") return "Agendados";
    if (status === "completed") return "Concluídos";
    if (status === "canceled") return "Cancelados";
    return "Todos";
  };

  return (
    <section className={`rounded-2xl border p-5 shadow-sm ${cardClass}`}>
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className={`text-lg font-black ${strongTextClass}`}>
            Filtros da agenda
          </h2>
          <p className={`mt-1 text-sm leading-6 ${mutedTextClass}`}>
            Refine a visualização por cliente, imóvel, status ou responsável.
          </p>
        </div>

        <button
          type="button"
          onClick={onClearFilters}
          className={secondaryButtonClass}
        >
          Limpar filtros
        </button>
      </div>

      <div className="mt-4 grid gap-3 grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_0.7fr]">
        <FilterField label="Buscar" isBlackTheme={isBlackTheme} className="col-span-2 md:col-span-1">
          <div className="relative">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-orange-600" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Cliente, imóvel, responsável, título..."
              className={`${inputClass} pl-11`}
            />
          </div>
        </FilterField>

        <FilterField label="Status" isBlackTheme={isBlackTheme}>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(event.target.value as ScheduleStatus | "all")
            }
            className={inputClass}
          >
            <option value="all">Todos</option>
            <option value="scheduled">Agendados</option>
            <option value="completed">Concluídos</option>
            <option value="canceled">Cancelados</option>
          </select>
        </FilterField>

        <FilterField label="Tipo" isBlackTheme={isBlackTheme}>
          <select
            value={typeFilter}
            onChange={(event) => setTypeFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">Todos</option>
            {uniqueTypeOptions.map((type) => (
              <option key={type} value={type}>
                {type}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Responsável" isBlackTheme={isBlackTheme}>
          <select
            value={responsibleFilter}
            onChange={(event) => setResponsibleFilter(event.target.value)}
            className={inputClass}
          >
            <option value="all">Todos</option>
            {uniqueResponsibleOptions.map((resp) => (
              <option key={resp} value={resp}>
                {resp}
              </option>
            ))}
          </select>
        </FilterField>

        <FilterField label="Prioridade" isBlackTheme={isBlackTheme}>
          <select
            value={priorityFilter}
            onChange={(event) =>
              setPriorityFilter(event.target.value as SchedulePriority | "all")
            }
            className={inputClass}
          >
            <option value="all">Todas</option>
            <option value="high">Alta</option>
            <option value="medium">Média</option>
            <option value="low">Baixa</option>
          </select>
        </FilterField>
      </div>

      {activeFilterCount > 0 && (
        <div
          className={`mt-4 flex flex-col justify-between gap-3 rounded-2xl border p-4 md:flex-row md:items-center ${
            isBlackTheme
              ? "border-orange-900/60 bg-orange-950/30"
              : "border-orange-200 bg-orange-50"
          }`}
        >
          <div>
            <p className="text-sm font-bold text-orange-700">Filtro aplicado</p>
            <p className={`text-sm ${mutedTextClass}`}>
              {filteredCount} compromisso(s) encontrado(s) · Status:{" "}
              <strong>{getStatusFilterLabel(statusFilter)}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClearFilters}
            className={secondaryButtonClass}
          >
            Remover filtros
          </button>
        </div>
      )}
    </section>
  );
}

function FilterField({
  children,
  className = "",
  isBlackTheme,
  label,
}: {
  children: ReactNode;
  className?: string;
  isBlackTheme: boolean;
  label: string;
}) {
  return (
    <label className={`space-y-2 ${className}`}>
      <span
        className={`block text-xs font-black uppercase tracking-[0.14em] ${
          isBlackTheme ? "text-[#94a3b8]" : "text-[#64748b]"
        }`}
      >
        {label}
      </span>
      {children}
    </label>
  );
}
