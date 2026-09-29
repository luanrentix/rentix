"use client";

import React from "react";
import { Search, Plus } from "lucide-react";
import type {
  PersonStatusFilter,
  PersonTypeFilter,
  PersonTenantFilter,
} from "./person-types";

interface PersonFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: PersonStatusFilter;
  onStatusFilterChange: (value: PersonStatusFilter) => void;
  typeFilter: PersonTypeFilter;
  onTypeFilterChange: (value: PersonTypeFilter) => void;
  tenantFilter: PersonTenantFilter;
  onTenantFilterChange: (value: PersonTenantFilter) => void;
  onNewPerson: () => void;
  totalCount: number;
  filteredCount: number;
}

export function PersonFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
  tenantFilter,
  onTenantFilterChange,
  onNewPerson,
  totalCount,
  filteredCount,
}: PersonFiltersProps) {
  return (
    <div className="space-y-4">
      {/* Cabeçalho da Seção com Título e Botão Nova Pessoa */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-black tracking-tight text-slate-950 sm:text-2xl">
            Cadastros de Pessoas
          </h2>
          <p className="mt-0.5 text-xs sm:text-sm font-medium text-slate-500">
            Exibindo <span className="font-bold text-slate-800">{filteredCount}</span> de{" "}
            <span className="font-bold text-slate-800">{totalCount}</span> registro(s) encontrado(s).
          </p>
        </div>

        <button
          type="button"
          onClick={onNewPerson}
          className="inline-flex items-center justify-center gap-2 rounded-2xl bg-orange-500 px-5 py-3 text-sm font-black text-white shadow-md shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-95 self-start sm:self-auto"
        >
          <Plus className="h-4 w-4" />
          Nova pessoa
        </button>
      </div>

      {/* Grid de Filtros e Busca */}
      <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-[minmax(280px,1.5fr)_160px_160px_170px]">
        {/* Campo de Busca Geral */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600">
            Buscar
          </label>
          <div className="relative">
            <input
              type="text"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              placeholder="Nome, documento, telefone, e-mail ou cidade..."
              className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
            />
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {/* Tipo de Pessoa: Física ou Jurídica */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600">
            Tipo
          </label>
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as PersonTypeFilter)}
            className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            <option value="all">Todos os tipos</option>
            <option value="individual">Pessoa física (PF)</option>
            <option value="company">Pessoa jurídica (PJ)</option>
          </select>
        </div>

        {/* Situação Cadastral: Ativo ou Inativo */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600">
            Situação
          </label>
          <select
            value={statusFilter}
            onChange={(e) => onStatusFilterChange(e.target.value as PersonStatusFilter)}
            className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            <option value="all">Todas as situações</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>

        {/* Uso / Perfil: Inquilino ou Outro */}
        <div className="space-y-1">
          <label className="text-xs font-black uppercase tracking-wider text-slate-600">
            Classificação
          </label>
          <select
            value={tenantFilter}
            onChange={(e) => onTenantFilterChange(e.target.value as PersonTenantFilter)}
            className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          >
            <option value="all">Todas as classificações</option>
            <option value="tenant">Inquilinos</option>
            <option value="non_tenant">Não inquilinos / Outros</option>
          </select>
        </div>
      </div>
    </div>
  );
}
