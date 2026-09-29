"use client";

import React, { useState } from "react";
import {
  User,
  UsersRound,
  LogIn,
  Building2,
  Calendar,
  Clock,
  ChevronDown,
  Shield,
  ShieldAlert,
} from "lucide-react";
import type {
  AdminUser,
  AdminUserRole,
  AdminCompany,
  QuickCommercialAction,
  SubscriptionStatus,
  TrialCompany,
} from "./admin-types";
import {
  formatDate,
  formatDateTime,
  getCompanyName,
  getSubscriptionLabel,
  getTrialDateInputValue,
  roleLabels,
  adminRoleOptions,
  commercialStatusOptions,
} from "./admin-types";
import {
  AdminStatusBadge,
  AdminSubscriptionBadge,
  AdminTrialDaysBadge,
} from "./admin-badges";

interface AdminUsersTableProps {
  users: AdminUser[];
  isLoading: boolean;
  updatingUserId: string;
  updatingCompanyId: string;
  onUpdateRole: (userId: string, role: AdminUserRole) => void;
  onToggleStatus: (user: AdminUser) => void;
  onImpersonate: (user: AdminUser) => void;
  onUpdateCompanyDueDate: (
    company: TrialCompany & { id: string },
    newDate: string,
  ) => void;
  onUpdateCompanyCommercialStatus: (
    company: TrialCompany & { id: string },
    status: SubscriptionStatus,
  ) => void;
  onOpenHistory: (company: AdminCompany) => void;
}

export function AdminUsersTable({
  users,
  isLoading,
  updatingUserId,
  updatingCompanyId,
  onUpdateRole,
  onToggleStatus,
  onImpersonate,
  onUpdateCompanyDueDate,
  onUpdateCompanyCommercialStatus,
  onOpenHistory,
}: AdminUsersTableProps) {
  const [openUserMenuId, setOpenUserMenuId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[2fr_1.5fr_1.2fr_1.2fr_1.5fr_1fr_120px] gap-4 bg-orange-50/50 px-5 py-4">
          {Array.from({ length: 7 }).map((_, index) => (
            <div
              key={`user-loading-head-${index}`}
              className="h-4 rounded-full bg-orange-100 animate-pulse"
            />
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div
              key={`user-loading-row-${rowIndex}`}
              className="grid grid-cols-[2fr_1.5fr_1.2fr_1.2fr_1.5fr_1fr_120px] gap-4 px-5 py-5"
            >
              {Array.from({ length: 7 }).map((__, colIndex) => (
                <div
                  key={`user-loading-cell-${rowIndex}-${colIndex}`}
                  className="h-4 rounded-full bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-600">
          👥
        </div>
        <h3 className="mt-4 text-base font-black text-slate-800">
          Nenhum usuário encontrado
        </h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Ajuste os filtros de pesquisa para visualizar usuários do sistema.
        </p>
      </div>
    );
  }

  return (
    <div className="hidden lg:block overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1100px] border-collapse text-left">
        <thead className="border-b border-slate-200 bg-slate-50/80">
          <tr>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Usuário
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Empresa
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Perfil
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Cadastrado / Acesso
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Vencimento Comercial
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Status
            </th>
            <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wider text-slate-600">
              Ações
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100 text-sm font-semibold text-slate-800">
          {users.map((item) => {
            const isUpdatingUser = updatingUserId === item.id;
            const isUpdatingCompany = updatingCompanyId === item.company.id;
            const isMenuOpen = openUserMenuId === item.id;

            return (
              <tr
                key={item.id}
                className="transition-colors hover:bg-slate-50/70"
              >
                {/* Usuário */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-100 font-black text-orange-700">
                      {item.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-950 truncate max-w-xs">
                        {item.name}
                      </p>
                      <p className="text-xs font-semibold text-slate-500 truncate max-w-xs">
                        {item.email}
                      </p>
                    </div>
                  </div>
                </td>

                {/* Empresa */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-slate-400 shrink-0" />
                    <span className="font-bold text-slate-800 truncate max-w-[180px]">
                      {getCompanyName(item.company)}
                    </span>
                  </div>
                </td>

                {/* Perfil (Role) */}
                <td className="px-5 py-4">
                  <select
                    value={item.role}
                    onChange={(e) =>
                      onUpdateRole(item.id, e.target.value as AdminUserRole)
                    }
                    disabled={isUpdatingUser}
                    className="h-9 w-full max-w-[160px] rounded-xl border border-slate-200 bg-white px-2.5 text-xs font-black text-slate-700 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-200 disabled:opacity-50"
                  >
                    {adminRoleOptions.map((role) => (
                      <option key={role} value={role}>
                        {roleLabels[role] || role}
                      </option>
                    ))}
                  </select>
                </td>

                {/* Datas de Cadastro e Último Login */}
                <td className="px-5 py-4">
                  <div className="space-y-0.5 text-xs">
                    <div className="text-slate-500">
                      Criado em {formatDate(item.createdAt)}
                    </div>
                    <div className="text-slate-700 font-bold">
                      Acesso:{" "}
                      {item.lastLoginAt
                        ? formatDateTime(item.lastLoginAt)
                        : "Nunca acessou"}
                    </div>
                  </div>
                </td>

                {/* Vencimento Comercial */}
                <td className="px-5 py-4">
                  <div className="space-y-1.5 max-w-[210px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AdminSubscriptionBadge company={item.company} />
                      <AdminTrialDaysBadge company={item.company} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={getTrialDateInputValue(item.company)}
                        onChange={(e) =>
                          onUpdateCompanyDueDate(item.company, e.target.value)
                        }
                        disabled={isUpdatingCompany}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-200 disabled:opacity-50"
                        title="Alterar vencimento da empresa"
                      />
                      <select
                        value={item.company.subscriptionStatus || "TRIAL"}
                        onChange={(e) =>
                          onUpdateCompanyCommercialStatus(
                            item.company,
                            e.target.value as SubscriptionStatus,
                          )
                        }
                        disabled={isUpdatingCompany}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-1.5 text-[11px] font-black text-slate-700 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-200 disabled:opacity-50"
                      >
                        {commercialStatusOptions.map((st) => (
                          <option key={st} value={st}>
                            {getSubscriptionLabel({ subscriptionStatus: st })}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </td>

                {/* Status Ativo/Inativo */}
                <td className="px-5 py-4">
                  <AdminStatusBadge active={item.isActive} />
                </td>

                {/* Ações */}
                <td className="px-5 py-4 text-right">
                  <div className="flex items-center justify-end gap-2">
                    {/* Botão de Impersonação Rápida */}
                    <button
                      type="button"
                      onClick={() => onImpersonate(item)}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-orange-50 px-3 text-xs font-black text-orange-700 transition hover:bg-orange-100 active:scale-95 shadow-sm"
                      title="Acessar plataforma simulando este usuário"
                    >
                      <LogIn className="h-3.5 w-3.5" />
                      Acessar
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleStatus(item)}
                      disabled={isUpdatingUser}
                      className={`inline-flex h-9 items-center justify-center rounded-xl px-3 text-xs font-black transition disabled:opacity-50 ${
                        item.isActive
                          ? "bg-red-50 text-red-700 hover:bg-red-100"
                          : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      }`}
                    >
                      {item.isActive ? "Inativar" : "Ativar"}
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
