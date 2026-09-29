"use client";

import React from "react";
import { X, Clock, History, FileText } from "lucide-react";
import type { AdminCommercialHistory, AdminCompany } from "../admin-types";
import { formatDate, formatDateTime, getCompanyName } from "../admin-types";

interface AdminHistoryModalProps {
  company: AdminCompany | null;
  history: AdminCommercialHistory[];
  isLoading: boolean;
  onClose: () => void;
}

export function AdminHistoryModal({
  company,
  history,
  isLoading,
  onClose,
}: AdminHistoryModalProps) {
  if (!company) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        {/* Header do Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-orange-50 text-orange-600">
              <History className="h-5 w-5" />
            </div>
            <div>
              <p className="text-[11px] font-black uppercase tracking-wider text-orange-600">
                Histórico Comercial & Auditoria
              </p>
              <h2 className="text-lg font-black text-slate-950">
                {getCompanyName(company)}
              </h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-10 w-10 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 transition hover:bg-red-50 hover:text-red-600"
            aria-label="Fechar histórico"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Lista de Registros */}
        <div className="flex-1 overflow-y-auto p-5 space-y-3">
          {isLoading ? (
            <div className="py-12 text-center text-sm font-semibold text-slate-400">
              Carregando histórico...
            </div>
          ) : history.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center text-sm font-bold text-slate-500">
              Nenhuma alteração comercial registrada para esta empresa.
            </div>
          ) : (
            history.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 transition hover:bg-white hover:shadow-sm"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-black text-slate-900">
                    {item.description}
                  </p>
                  <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 ring-1 ring-slate-200">
                    {formatDateTime(item.createdAt)}
                  </span>
                </div>
                <div className="mt-2 flex items-center gap-2">
                  <span className="rounded-md bg-orange-100 px-2 py-0.5 text-[10px] font-black uppercase text-orange-800">
                    {item.action}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 p-4 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl bg-slate-200 px-5 py-2.5 text-xs font-black text-slate-700 transition hover:bg-slate-300"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
}
