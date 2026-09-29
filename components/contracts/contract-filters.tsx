"use client";

import React from "react";
import { Search } from "lucide-react";
import {
  ContractFilterStatus,
  ContractTypeFilter,
} from "./contract-types";

interface ContractFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  statusFilter: ContractFilterStatus;
  onStatusFilterChange: (value: ContractFilterStatus) => void;
  typeFilter: ContractTypeFilter;
  onTypeFilterChange: (value: ContractTypeFilter) => void;
}

export function ContractFilters({
  search,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  typeFilter,
  onTypeFilterChange,
}: ContractFiltersProps) {
  return (
    <div className="grid w-full gap-3 md:grid-cols-2 xl:grid-cols-[minmax(320px,1.5fr)_220px_200px]">
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
            placeholder="Buscar por imóvel, inquilino, endereço ou código..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      {/* Filtro de Status */}
      <div className="space-y-1">
        <label className="text-xs font-black uppercase tracking-wider text-slate-600">
          Status do Contrato
        </label>
        <select
          value={statusFilter}
          onChange={(e) => onStatusFilterChange(e.target.value as ContractFilterStatus)}
          className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        >
          <option value="All">Todos os status</option>
          <option value="Active">Ativos (vigentes)</option>
          <option value="Scheduled">Agendados (a iniciar)</option>
          <option value="Expiring">A Vencer (próximos 30 dias)</option>
          <option value="Expired">Vencidos</option>
          <option value="Finished">Finalizados</option>
          <option value="Canceled">Cancelados</option>
        </select>
      </div>

      {/* Filtro por Tipo */}
      <div className="space-y-1">
        <label className="text-xs font-black uppercase tracking-wider text-slate-600">
          Modalidade
        </label>
        <select
          value={typeFilter}
          onChange={(e) => onTypeFilterChange(e.target.value as ContractTypeFilter)}
          className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
        >
          <option value="All">Todas as modalidades</option>
          <option value="STANDARD">Padrão (Mensal)</option>
          <option value="TEMPORARY">Temporada (Curto prazo)</option>
        </select>
      </div>
    </div>
  );
}
