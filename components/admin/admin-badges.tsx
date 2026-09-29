"use client";

import React from "react";
import type { AdminCompany, TrialCompany } from "./admin-types";
import {
  getSubscriptionLabel,
  getTrialDaysLabel,
  getTrialDaysRemaining,
} from "./admin-types";
import { Users, UsersRound, Building2, FileText, CheckCircle2, XCircle } from "lucide-react";

export function AdminStatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-black ring-1 ${
        active
          ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
          : "bg-red-50 text-red-700 ring-red-200"
      }`}
    >
      {active ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <XCircle className="h-3.5 w-3.5" />
      )}
      {active ? "Ativo" : "Inativo"}
    </span>
  );
}

export function AdminSubscriptionBadge({ company }: { company: TrialCompany }) {
  const status = company.subscriptionStatus;
  const toneClassName =
    status === "ACTIVE"
      ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
      : status === "TRIAL"
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : status === "EXPIRED"
      ? "bg-amber-50 text-amber-700 ring-amber-200"
      : "bg-red-50 text-red-700 ring-red-200";

  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-black ring-1 ${toneClassName}`}
    >
      {getSubscriptionLabel(company)}
    </span>
  );
}

export function AdminTrialDaysBadge({ company }: { company: TrialCompany }) {
  const daysRemaining = getTrialDaysRemaining(company);
  const toneClassName =
    daysRemaining === null
      ? "bg-slate-50 text-slate-600 ring-slate-200"
      : daysRemaining < 0
      ? "bg-red-50 text-red-700 ring-red-200"
      : daysRemaining <= 3
      ? "bg-amber-50 text-amber-800 ring-amber-200"
      : daysRemaining <= 7
      ? "bg-blue-50 text-blue-700 ring-blue-200"
      : "bg-emerald-50 text-emerald-700 ring-emerald-200";

  return (
    <span
      className={`inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-[11px] font-black ring-1 ${toneClassName}`}
    >
      {getTrialDaysLabel(company)}
    </span>
  );
}

export function AdminOperationalCounts({ company }: { company: AdminCompany }) {
  return (
    <div className="grid grid-cols-4 gap-1.5 text-center text-xs">
      <div className="rounded-xl bg-slate-50 p-1.5 ring-1 ring-slate-100">
        <span className="block text-xs font-black text-slate-900">
          {company._count?.users ?? 0}
        </span>
        <span className="block text-[9px] font-bold uppercase text-slate-400">
          Usuários
        </span>
      </div>
      <div className="rounded-xl bg-slate-50 p-1.5 ring-1 ring-slate-100">
        <span className="block text-xs font-black text-slate-900">
          {company._count?.properties ?? 0}
        </span>
        <span className="block text-[9px] font-bold uppercase text-slate-400">
          Bens/Ativos
        </span>
      </div>
      <div className="rounded-xl bg-slate-50 p-1.5 ring-1 ring-slate-100">
        <span className="block text-xs font-black text-slate-900">
          {company._count?.contracts ?? 0}
        </span>
        <span className="block text-[9px] font-bold uppercase text-slate-400">
          Contratos
        </span>
      </div>
      <div className="rounded-xl bg-slate-50 p-1.5 ring-1 ring-slate-100">
        <span className="block text-xs font-black text-slate-900">
          {company._count?.people ?? 0}
        </span>
        <span className="block text-[9px] font-bold uppercase text-slate-400">
          Pessoas
        </span>
      </div>
    </div>
  );
}
