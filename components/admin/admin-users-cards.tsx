"use client";

import React from "react";
import {
  LogIn,
  Building2,
  Calendar,
  Clock,
} from "lucide-react";
import type {
  AdminUser,
  AdminUserRole,
  AdminCompany,
  SubscriptionStatus,
  TrialCompany,
} from "./admin-types";
import {
  formatDate,
  formatDateTime,
  getCompanyName,
  roleLabels,
  adminRoleOptions,
  getSubscriptionLabel,
  getTrialDateInputValue,
  commercialStatusOptions,
} from "./admin-types";
import {
  AdminStatusBadge,
  AdminSubscriptionBadge,
  AdminTrialDaysBadge,
} from "./admin-badges";

interface AdminUsersCardsProps {
  users: AdminUser[];
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

export function AdminUsersCards({
  users,
  updatingUserId,
  updatingCompanyId,
  onUpdateRole,
  onToggleStatus,
  onImpersonate,
  onUpdateCompanyDueDate,
  onUpdateCompanyCommercialStatus,
  onOpenHistory,
}: AdminUsersCardsProps) {
  if (users.length === 0) {
    return null;
  }

  return (
    <div className="block lg:hidden space-y-3">
      {users.map((item) => {
        const isUpdatingUser = updatingUserId === item.id;
        const isUpdatingCompany = updatingCompanyId === item.company.id;

        return (
          <div
            key={item.id}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
          >
            {/* Header com avatar e nome */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-orange-100 font-black text-orange-700">
                  {item.name.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    {item.name}
                  </h3>
                  <p className="text-xs text-slate-500 font-semibold">{item.email}</p>
                </div>
              </div>

              <AdminStatusBadge active={item.isActive} />
            </div>

            {/* Informações da Empresa e Perfil */}
            <div className="space-y-2 rounded-2xl bg-slate-50 p-3 text-xs font-semibold text-slate-600 border border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Empresa:</span>
                <span className="font-extrabold text-slate-900">
                  {getCompanyName(item.company)}
                </span>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-400">Perfil:</span>
                <select
                  value={item.role}
                  onChange={(e) =>
                    onUpdateRole(item.id, e.target.value as AdminUserRole)
                  }
                  disabled={isUpdatingUser}
                  className="h-8 rounded-xl border border-slate-200 bg-white px-2 text-xs font-black text-slate-700 outline-none transition focus:border-orange-500"
                >
                  {adminRoleOptions.map((role) => (
                    <option key={role} value={role}>
                      {roleLabels[role] || role}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Último Acesso:</span>
                <span className="font-bold text-slate-700">
                  {item.lastLoginAt ? formatDateTime(item.lastLoginAt) : "Nunca"}
                </span>
              </div>
            </div>

            {/* Situação Comercial */}
            <div className="space-y-2 rounded-2xl bg-orange-50/60 p-3 border border-orange-100/80">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <AdminSubscriptionBadge company={item.company} />
                <AdminTrialDaysBadge company={item.company} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    value={getTrialDateInputValue(item.company)}
                    onChange={(e) =>
                      onUpdateCompanyDueDate(item.company, e.target.value)
                    }
                    disabled={isUpdatingCompany}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 outline-none transition focus:border-orange-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Plano Comercial
                  </label>
                  <select
                    value={item.company.subscriptionStatus || "TRIAL"}
                    onChange={(e) =>
                      onUpdateCompanyCommercialStatus(
                        item.company,
                        e.target.value as SubscriptionStatus,
                      )
                    }
                    disabled={isUpdatingCompany}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-1 text-[11px] font-black text-slate-700 outline-none transition focus:border-orange-500"
                  >
                    {commercialStatusOptions.map((st) => (
                      <option key={st} value={st}>
                        {getSubscriptionLabel({ subscriptionStatus: st })}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Botões de Ação */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <button
                type="button"
                onClick={() => onImpersonate(item)}
                className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-orange-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-orange-700 active:scale-95"
              >
                <LogIn className="h-3.5 w-3.5" />
                Acessar como Usuário
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
          </div>
        );
      })}
    </div>
  );
}
