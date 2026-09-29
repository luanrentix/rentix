"use client";

import React from "react";
import { Search, RotateCcw, Building2 } from "lucide-react";
import type {
  AdminTab,
  CommercialFilter,
  DueFilter,
  StatusFilter,
} from "./admin-types";
import { commercialStatusOptions, roleLabels } from "./admin-types";

interface AdminFiltersProps {
  activeTab: AdminTab;
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: StatusFilter;
  onStatusFilterChange: (value: StatusFilter) => void;
  commercialFilter: CommercialFilter;
  onCommercialFilterChange: (value: CommercialFilter) => void;
  dueFilter: DueFilter;
  onDueFilterChange: (value: DueFilter) => void;
  roleFilter: string;
  onRoleFilterChange: (value: string) => void;
  roleOptions: string[];
  hideEmptyCompanies: boolean;
  onHideEmptyCompaniesChange: (value: boolean) => void;
  emptyCompaniesCount: number;
  totalFilteredRecords: number;
  onClearFilters: () => void;
}

export function AdminFilters({
  activeTab,
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  commercialFilter,
  onCommercialFilterChange,
  dueFilter,
  onDueFilterChange,
  roleFilter,
  onRoleFilterChange,
  roleOptions,
  hideEmptyCompanies,
  onHideEmptyCompaniesChange,
  emptyCompaniesCount,
  totalFilteredRecords,
  onClearFilters,
}: AdminFiltersProps) {
  const isCompaniesTab = activeTab === "empresas";
  const isUsersTab = activeTab === "usuarios";

  if (!isCompaniesTab && !isUsersTab) {
    return null;
  }

  const hasActiveFilters =
    search.trim() !== "" ||
    statusFilter !== "all" ||
    commercialFilter !== "all" ||
    dueFilter !== "all" ||
    (isUsersTab && roleFilter !== "all");

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
      <div className="grid w-full gap-3 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-[minmax(240px,2fr)_160px_170px_160px_auto]">
        {/* Campo de Busca */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600">
            Buscar
          </label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder={
                isCompaniesTab
                  ? "Nome fantasia, razão, CNPJ, e-mail ou telefone..."
                  : "Nome do usuário, e-mail ou empresa..."
              }
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Status de Ativação */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600">
            Status
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as StatusFilter)}
            className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            <option value="all">Todos os status</option>
            <option value="active">Apenas Ativos</option>
            <option value="inactive">Apenas Inativos</option>
          </select>
        </div>

        {/* Situação Comercial */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600">
            Situação Comercial
          </label>
          <select
            value={commercialFilter}
            onChange={(e) =>
              onCommercialFilterChange(e.target.value as CommercialFilter)
            }
            className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            <option value="all">Todas as situações</option>
            {commercialStatusOptions.map((status) => (
              <option key={status} value={status}>
                {status === "ACTIVE"
                  ? "Plano Ativo"
                  : status === "TRIAL"
                  ? "Teste (Trial)"
                  : status === "EXPIRED"
                  ? "Vencido"
                  : status === "SUSPENDED"
                  ? "Suspenso"
                  : "Cancelado"}
              </option>
            ))}
          </select>
        </div>

        {/* Filtro de Vencimento Comercial */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600">
            Vencimento
          </label>
          <select
            value={dueFilter}
            onChange={(e) => onDueFilterChange(e.target.value as DueFilter)}
            className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            <option value="all">Todos prazos</option>
            <option value="today">Vence Hoje</option>
            <option value="threeDays">Até 3 dias</option>
            <option value="sevenDays">Até 7 dias</option>
            <option value="expired">Já Vencidos</option>
            <option value="noDueDate">Sem data limite</option>
          </select>
        </div>

        {/* Se estiver na aba Usuários: Filtro por Perfil */}
        {isUsersTab && (
          <div className="space-y-1">
            <label className="text-xs font-black uppercase tracking-wider text-slate-600">
              Perfil
            </label>
            <select
              value={roleFilter}
              onChange={(e) => onRoleFilterChange(e.target.value)}
              className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            >
              <option value="all">Todos os perfis</option>
              {roleOptions.map((role) => (
                <option key={role} value={role}>
                  {roleLabels[role] || role}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Botão Limpar Filtros */}
        {hasActiveFilters && (
          <div className="flex items-end">
            <button
              type="button"
              onClick={onClearFilters}
              className="flex h-[46px] w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 text-xs font-black text-slate-600 transition hover:bg-slate-100"
              title="Limpar todos os filtros"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Limpar
            </button>
          </div>
        )}
      </div>

      {/* Barra de Contadores e Toggle de Empresas Vazias */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs font-bold text-slate-500">
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-slate-100 px-3 py-1 font-black text-slate-700 ring-1 ring-slate-200">
            {totalFilteredRecords} {isCompaniesTab ? "empresas" : "usuários"} exibidos
          </span>

          {isCompaniesTab && emptyCompaniesCount > 0 && (
            <button
              type="button"
              onClick={() => onHideEmptyCompaniesChange(!hideEmptyCompanies)}
              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-black transition ${
                hideEmptyCompanies
                  ? "bg-orange-50 text-orange-700 ring-1 ring-orange-200 hover:bg-orange-100"
                  : "bg-slate-100 text-slate-600 ring-1 ring-slate-200 hover:bg-slate-200"
              }`}
            >
              <Building2 className="h-3.5 w-3.5" />
              {hideEmptyCompanies
                ? `Ocultando ${emptyCompaniesCount} sem dados (clique p/ exibir)`
                : `Exibindo todas (${emptyCompaniesCount} vazias)`}
            </button>
          )}
        </div>

        {hasActiveFilters && (
          <span className="text-[11px] text-orange-600 font-black">
            Filtros ativos aplicados
          </span>
        )}
      </div>
    </div>
  );
}
