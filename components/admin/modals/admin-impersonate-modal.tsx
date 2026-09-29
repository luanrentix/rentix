"use client";

import React from "react";
import { LogIn, ShieldAlert, X } from "lucide-react";
import type { AdminUser } from "../admin-types";
import { getCompanyName } from "../admin-types";

interface AdminImpersonateModalProps {
  user: AdminUser | null;
  isLoading: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function AdminImpersonateModal({
  user,
  isLoading,
  onConfirm,
  onCancel,
}: AdminImpersonateModalProps) {
  if (!user) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
        <div className="flex items-start gap-4 border-b border-slate-100 bg-orange-50/60 p-5">
          <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-orange-600 text-white shadow-md shadow-orange-200">
            <LogIn className="h-6 w-6" />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-black text-slate-950">
              Acesso via Personificação (Impersonate)
            </h2>
            <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
              Você entrará no sistema simulando o acesso deste usuário para suporte técnico e auditoria.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white text-slate-400 ring-1 ring-slate-200 transition hover:bg-slate-100"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5 text-xs font-bold space-y-1.5">
            <div className="flex justify-between">
              <span className="text-slate-400">Usuário:</span>
              <span className="text-slate-900 font-black">{user.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">E-mail:</span>
              <span className="text-slate-700">{user.email}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Empresa:</span>
              <span className="text-slate-900 font-extrabold">
                {getCompanyName(user.company)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2.5 rounded-2xl bg-amber-50 p-3 text-[11px] font-bold text-amber-800">
            <ShieldAlert className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" />
            <p>
              Esta ação será auditada no histórico comercial. Um banner no topo da tela permitirá que você retorne ao painel master a qualquer momento.
            </p>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2.5 p-4 sm:flex-row sm:justify-end bg-slate-50/50 border-t border-slate-100">
          <button
            type="button"
            onClick={onCancel}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center rounded-2xl border border-slate-200 bg-white px-5 text-xs font-black text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-orange-600 px-5 text-xs font-black text-white shadow-md shadow-orange-200 transition hover:bg-orange-700 active:scale-95 disabled:opacity-50"
          >
            <LogIn className="h-4 w-4" />
            {isLoading ? "Iniciando sessão..." : "Acessar Agora"}
          </button>
        </div>
      </div>
    </div>
  );
}
