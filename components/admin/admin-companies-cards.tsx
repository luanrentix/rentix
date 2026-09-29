"use client";

import React, { useState } from "react";
import {
  Building2,
  Phone,
  Mail,
  Calendar,
  History,
  Clock,
  Sparkles,
  AlertTriangle,
  ChevronDown,
  MessageCircle,
} from "lucide-react";
import type {
  AdminCompany,
  QuickCommercialAction,
  SubscriptionStatus,
  TrialCompany,
} from "./admin-types";
import {
  formatCnpj,
  formatDate,
  formatPhone,
  getCompanyName,
  getOperationalCompanyRecords,
  getSubscriptionLabel,
  getTrialDateInputValue,
  getWhatsappMessageUrl,
  commercialStatusOptions,
} from "./admin-types";
import {
  AdminOperationalCounts,
  AdminStatusBadge,
  AdminSubscriptionBadge,
  AdminTrialDaysBadge,
} from "./admin-badges";

interface AdminCompaniesCardsProps {
  companies: AdminCompany[];
  updatingCompanyId: string;
  onToggleStatus: (company: AdminCompany) => void;
  onExtendTrial: (company: AdminCompany) => void;
  onUpdateDueDate: (company: TrialCompany & { id: string }, newDate: string) => void;
  onUpdateCommercialStatus: (
    company: TrialCompany & { id: string },
    status: SubscriptionStatus,
  ) => void;
  onQuickAction: (company: TrialCompany & { id: string }, action: QuickCommercialAction) => void;
  onOpenHistory: (company: AdminCompany) => void;
}

export function AdminCompaniesCards({
  companies,
  updatingCompanyId,
  onToggleStatus,
  onExtendTrial,
  onUpdateDueDate,
  onUpdateCommercialStatus,
  onQuickAction,
  onOpenHistory,
}: AdminCompaniesCardsProps) {
  const [openCardActionId, setOpenCardActionId] = useState<string | null>(null);

  if (companies.length === 0) {
    return null;
  }

  return (
    <div className="block lg:hidden space-y-3">
      {companies.map((company) => {
        const isUpdating = updatingCompanyId === company.id;
        const totalRecords = getOperationalCompanyRecords(company);
        const isMenuOpen = openCardActionId === company.id;

        const whatsappWelcome = getWhatsappMessageUrl(company, "welcome");
        const whatsappDue = getWhatsappMessageUrl(company, "due");
        const whatsappExpired = getWhatsappMessageUrl(company, "expired");

        return (
          <div
            key={company.id}
            className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm space-y-3"
          >
            {/* Header do Card */}
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 font-black text-orange-600">
                  <Building2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 leading-tight">
                    {getCompanyName(company)}
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    {company.companyName || "Razão não informada"}
                  </p>
                </div>
              </div>

              <AdminStatusBadge active={company.isActive} />
            </div>

            {/* CNPJ e Contatos */}
            <div className="space-y-1 rounded-2xl bg-slate-50 p-2.5 text-xs font-semibold text-slate-600 border border-slate-100">
              {company.document && (
                <div className="font-mono font-bold text-slate-700">
                  {formatCnpj(company.document)}
                </div>
              )}
              {company.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="h-3 w-3 text-slate-400" />
                  <span>{formatPhone(company.phone)}</span>
                </div>
              )}
              {company.email && (
                <div className="flex items-center gap-1.5 text-slate-500 truncate">
                  <Mail className="h-3 w-3 text-slate-400" />
                  <span className="truncate">{company.email}</span>
                </div>
              )}
            </div>

            {/* Dados Operacionais */}
            <AdminOperationalCounts company={company} />

            {/* Situação Comercial e Data */}
            <div className="space-y-2 rounded-2xl bg-orange-50/60 p-3 border border-orange-100/80">
              <div className="flex flex-wrap items-center justify-between gap-1.5">
                <AdminSubscriptionBadge company={company} />
                <AdminTrialDaysBadge company={company} />
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="space-y-0.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Vencimento
                  </label>
                  <input
                    type="date"
                    value={getTrialDateInputValue(company)}
                    onChange={(e) => onUpdateDueDate(company, e.target.value)}
                    disabled={isUpdating}
                    className="w-full h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 outline-none transition focus:border-orange-500"
                  />
                </div>

                <div className="space-y-0.5">
                  <label className="text-[10px] font-black uppercase text-slate-500">
                    Status Comercial
                  </label>
                  <select
                    value={company.subscriptionStatus || "TRIAL"}
                    onChange={(e) =>
                      onUpdateCommercialStatus(
                        company,
                        e.target.value as SubscriptionStatus,
                      )
                    }
                    disabled={isUpdating}
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

            {/* Ações Mobile */}
            <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
              <button
                type="button"
                onClick={() => onOpenHistory(company)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-2 text-xs font-black text-slate-700 hover:bg-slate-200 transition"
              >
                <History className="h-3.5 w-3.5 text-orange-600" />
                Histórico
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onQuickAction(company, "extend7")}
                  disabled={isUpdating}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-black text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  +7d
                </button>
                <button
                  type="button"
                  onClick={() => onToggleStatus(company)}
                  disabled={isUpdating}
                  className={`rounded-xl px-3 py-2 text-xs font-black transition disabled:opacity-50 ${
                    company.isActive
                      ? "bg-red-50 text-red-700 hover:bg-red-100"
                      : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                  }`}
                >
                  {company.isActive ? "Inativar" : "Ativar"}
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
