"use client";

import React from "react";
import { Search } from "lucide-react";
import {
  assetCategories,
  operationalStatusOptions,
  PropertyCategoryFilterStatus,
  PropertyRegistrationFilterStatus,
  PropertyOperationalFilterStatus,
} from "./asset-types";

interface AssetFiltersProps {
  search: string;
  onSearchChange: (value: string) => void;
  categoryFilter: PropertyCategoryFilterStatus;
  onCategoryFilterChange: (value: PropertyCategoryFilterStatus) => void;
  registrationFilter: PropertyRegistrationFilterStatus;
  onRegistrationFilterChange: (value: PropertyRegistrationFilterStatus) => void;
  operationalStatusFilter: PropertyOperationalFilterStatus;
  onOperationalStatusFilterChange: (value: PropertyOperationalFilterStatus) => void;
}

export function AssetFilters({
  search,
  onSearchChange,
  categoryFilter,
  onCategoryFilterChange,
  registrationFilter,
  onRegistrationFilterChange,
  operationalStatusFilter,
  onOperationalStatusFilterChange,
}: AssetFiltersProps) {
  return (
    <div className="grid w-full min-w-0 gap-3 grid-cols-1 sm:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_160px_160px_150px]">
      <div className="min-w-0 space-y-1">
        <label className="text-xs font-black uppercase tracking-wider text-slate-600">
          Buscar
        </label>
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Nome, código, placa, série, endereço ou patrimônio..."
            className="w-full rounded-2xl border border-slate-200 bg-white py-3 pl-10 pr-4 text-sm font-semibold text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-100"
          />
          <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
        </div>
      </div>

      <div className="min-w-0 space-y-1">
        <label className="text-xs font-black uppercase tracking-wider text-slate-600">
          Categoria
        </label>
        <select
          value={categoryFilter}
          onChange={(e) =>
            onCategoryFilterChange(e.target.value as PropertyCategoryFilterStatus)
          }
          className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 truncate"
        >
          <option value="All">Todas as categorias</option>
          {assetCategories.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0 space-y-1">
        <label className="text-xs font-black uppercase tracking-wider text-slate-600">
          Status Operacional
        </label>
        <select
          value={operationalStatusFilter}
          onChange={(e) =>
            onOperationalStatusFilterChange(
              e.target.value as PropertyOperationalFilterStatus
            )
          }
          className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 truncate"
        >
          <option value="All">Todos os status</option>
          {operationalStatusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
      </div>

      <div className="min-w-0 space-y-1">
        <label className="text-xs font-black uppercase tracking-wider text-slate-600">
          Cadastro
        </label>
        <select
          value={registrationFilter}
          onChange={(e) =>
            onRegistrationFilterChange(
              e.target.value as PropertyRegistrationFilterStatus
            )
          }
          className="w-full appearance-auto rounded-2xl border border-slate-200 bg-white px-3.5 py-3 text-sm font-semibold text-slate-700 outline-none transition focus:border-orange-500 focus:ring-2 focus:ring-orange-100 truncate"
        >
          <option value="Active">Apenas Ativos</option>
          <option value="Inactive">Apenas Inativos</option>
          <option value="All">Todos os Cadastros</option>
        </select>
      </div>
    </div>
  );
}
