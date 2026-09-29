"use client";

import React, { useState, useRef, useEffect, useLayoutEffect } from "react";
import {
  Building2,
  Mail,
  Phone,
  Calendar,
  History,
  ChevronDown,
  MessageCircle,
  Clock,
  Sparkles,
  AlertTriangle,
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

interface AdminCompaniesTableProps {
  companies: AdminCompany[];
  isLoading: boolean;
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

export function AdminCompaniesTable({
  companies,
  isLoading,
  updatingCompanyId,
  onToggleStatus,
  onExtendTrial,
  onUpdateDueDate,
  onUpdateCommercialStatus,
  onQuickAction,
  onOpenHistory,
}: AdminCompaniesTableProps) {
  const [openActionId, setOpenActionId] = useState<string | null>(null);

  if (isLoading) {
    return (
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white">
        <div className="grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_120px] gap-4 bg-orange-50/50 px-5 py-4">
          {Array.from({ length: 6 }).map((_, index) => (
            <div
              key={`comp-loading-head-${index}`}
              className="h-4 rounded-full bg-orange-100 animate-pulse"
            />
          ))}
        </div>
        <div className="divide-y divide-slate-100">
          {Array.from({ length: 5 }).map((_, rowIndex) => (
            <div
              key={`comp-loading-row-${rowIndex}`}
              className="grid grid-cols-[2fr_1.5fr_1.5fr_1.5fr_1fr_120px] gap-4 px-5 py-5"
            >
              {Array.from({ length: 6 }).map((__, colIndex) => (
                <div
                  key={`comp-loading-cell-${rowIndex}-${colIndex}`}
                  className="h-4 rounded-full bg-slate-100 animate-pulse"
                />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (companies.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-orange-50 text-2xl text-orange-600">
          🏢
        </div>
        <h3 className="mt-4 text-base font-black text-slate-800">
          Nenhuma empresa encontrada
        </h3>
        <p className="mt-1 text-sm font-semibold text-slate-500">
          Ajuste os filtros de busca ou cadastre uma nova empresa na plataforma.
        </p>
      </div>
    );
  }

  return (
    <div className="hidden lg:block overflow-x-auto rounded-3xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-[1050px] border-collapse text-left">
        <thead className="border-b border-slate-200 bg-slate-50/80">
          <tr>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Empresa
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              CNPJ & Contato
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Dados Operacionais
            </th>
            <th className="px-5 py-4 text-xs font-black uppercase tracking-wider text-slate-600">
              Situação & Vencimento
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
          {companies.map((company) => {
            const isUpdating = updatingCompanyId === company.id;
            const totalRecords = getOperationalCompanyRecords(company);
            const isMenuOpen = openActionId === company.id;

            const whatsappWelcome = getWhatsappMessageUrl(company, "welcome");
            const whatsappDue = getWhatsappMessageUrl(company, "due");
            const whatsappExpired = getWhatsappMessageUrl(company, "expired");

            return (
              <tr
                key={company.id}
                className="transition-colors hover:bg-slate-50/70"
              >
                {/* Nome Fantasia e Razão */}
                <td className="px-5 py-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 font-black text-orange-600">
                      <Building2 className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-black text-slate-950 truncate max-w-xs">
                        {getCompanyName(company)}
                      </p>
                      <p className="text-xs font-bold text-slate-400 truncate max-w-xs">
                        {company.companyName || "Razão não informada"}
                      </p>
                      <span className="mt-1 block text-[10px] font-bold text-slate-400">
                        Criada em {formatDate(company.createdAt)}
                      </span>
                    </div>
                  </div>
                </td>

                {/* CNPJ & Contatos */}
                <td className="px-5 py-4">
                  <div className="space-y-1 text-xs">
                    {company.document ? (
                      <span className="font-mono font-bold text-slate-700 block">
                        {formatCnpj(company.document)}
                      </span>
                    ) : (
                      <span className="text-slate-400 block">Sem CNPJ</span>
                    )}
                    {company.phone && (
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="h-3 w-3 text-slate-400 shrink-0" />
                        <span>{formatPhone(company.phone)}</span>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center gap-1.5 text-slate-500 truncate max-w-xs">
                        <Mail className="h-3 w-3 text-slate-400 shrink-0" />
                        <span className="truncate">{company.email}</span>
                      </div>
                    )}
                  </div>
                </td>

                {/* Dados Operacionais */}
                <td className="px-5 py-4">
                  <div className="max-w-[220px]">
                    <AdminOperationalCounts company={company} />
                    <span className="mt-1.5 block text-center text-[10px] font-bold text-slate-400">
                      Total: {totalRecords} registros cadastrados
                    </span>
                  </div>
                </td>

                {/* Situação Comercial e Data de Vencimento */}
                <td className="px-5 py-4">
                  <div className="space-y-2 max-w-[210px]">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <AdminSubscriptionBadge company={company} />
                      <AdminTrialDaysBadge company={company} />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <input
                        type="date"
                        value={getTrialDateInputValue(company)}
                        onChange={(e) => onUpdateDueDate(company, e.target.value)}
                        disabled={isUpdating}
                        className="h-8 rounded-lg border border-slate-200 bg-white px-2 text-[11px] font-black text-slate-700 outline-none transition focus:border-orange-500 focus:ring-1 focus:ring-orange-200 disabled:opacity-50"
                        title="Alterar data limite de acesso comercial"
                      />
                      <select
                        value={company.subscriptionStatus || "TRIAL"}
                        onChange={(e) =>
                          onUpdateCommercialStatus(
                            company,
                            e.target.value as SubscriptionStatus,
                          )
                        }
                        disabled={isUpdating}
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
                  <AdminStatusBadge active={company.isActive} />
                </td>

                {/* Ações */}
                <td className="px-5 py-4 text-right">
                  <div className="relative inline-block text-left">
                    <button
                      type="button"
                      onClick={() =>
                        setOpenActionId(isMenuOpen ? null : company.id)
                      }
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-black text-slate-700 shadow-sm transition hover:bg-slate-50"
                    >
                      Ações
                      <ChevronDown
                        className={`h-3.5 w-3.5 transition-transform ${
                          isMenuOpen ? "rotate-180" : ""
                        }`}
                      />
                    </button>

                    {isMenuOpen && (
                      <>
                        <button
                          type="button"
                          className="fixed inset-0 z-40 cursor-default"
                          onClick={() => setOpenActionId(null)}
                        />

                        <div className="absolute right-0 z-50 mt-1.5 w-56 origin-top-right rounded-2xl border border-slate-200 bg-white p-1.5 text-left text-xs font-bold text-slate-700 shadow-xl ring-1 ring-black/5">
                          {/* Alternar Status */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionId(null);
                              onToggleStatus(company);
                            }}
                            className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left font-black transition ${
                              company.isActive
                                ? "text-red-700 hover:bg-red-50"
                                : "text-emerald-700 hover:bg-emerald-50"
                            }`}
                          >
                            {company.isActive
                              ? "Inativar Empresa"
                              : "Ativar Empresa"}
                          </button>

                          <div className="my-1 h-px bg-slate-100" />

                          {/* Ações Rápidas Comerciais */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionId(null);
                              onQuickAction(company, "extend7");
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            Prorrogar +7 dias (Trial)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionId(null);
                              onQuickAction(company, "extend15");
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-slate-50"
                          >
                            <Clock className="h-3.5 w-3.5 text-blue-600" />
                            Prorrogar +15 dias (Trial)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionId(null);
                              onQuickAction(company, "active30");
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-slate-50 text-emerald-700 font-black"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Ativar Plano (30 dias)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionId(null);
                              onQuickAction(company, "active365");
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left hover:bg-slate-50 text-emerald-700 font-black"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Ativar Plano (1 ano)
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionId(null);
                              onQuickAction(company, "suspend");
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-red-700 hover:bg-red-50"
                          >
                            <AlertTriangle className="h-3.5 w-3.5" />
                            Suspender Empresa
                          </button>

                          <div className="my-1 h-px bg-slate-100" />

                          {/* Histórico Comercial */}
                          <button
                            type="button"
                            onClick={() => {
                              setOpenActionId(null);
                              onOpenHistory(company);
                            }}
                            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-orange-600 font-black hover:bg-orange-50"
                          >
                            <History className="h-3.5 w-3.5" />
                            Ver Histórico Comercial
                          </button>

                          {/* Links WhatsApp */}
                          {company.phone && (
                            <>
                              <div className="my-1 h-px bg-slate-100" />
                              <span className="block px-3 py-1 text-[10px] font-black uppercase text-slate-400">
                                WhatsApp Rápido
                              </span>
                              {whatsappWelcome && (
                                <a
                                  href={whatsappWelcome}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => setOpenActionId(null)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-emerald-700 hover:bg-emerald-50 text-[11px]"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  Boas-vindas
                                </a>
                              )}
                              {whatsappDue && (
                                <a
                                  href={whatsappDue}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => setOpenActionId(null)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-amber-700 hover:bg-amber-50 text-[11px]"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  Aviso de Vencimento
                                </a>
                              )}
                              {whatsappExpired && (
                                <a
                                  href={whatsappExpired}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={() => setOpenActionId(null)}
                                  className="flex w-full items-center gap-2 rounded-xl px-3 py-1.5 text-left text-red-700 hover:bg-red-50 text-[11px]"
                                >
                                  <MessageCircle className="h-3 w-3" />
                                  Aviso de Vencido
                                </a>
                              )}
                            </>
                          )}
                        </div>
                      </>
                    )}
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
