"use client";

import React from "react";
import { UserX, UserCheck, X } from "lucide-react";
import type { Person } from "./person-types";

interface PersonInactivateModalProps {
  person: Person | null;
  isOpen: boolean;
  isProcessing: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function PersonInactivateModal({
  person,
  isOpen,
  isProcessing,
  onClose,
  onConfirm,
}: PersonInactivateModalProps) {
  if (!isOpen || !person) return null;

  const isActive = person.status === "active";
  const actionTitle = isActive ? "Inativar Pessoa" : "Reativar Pessoa";
  const actionButtonText = isActive ? "Sim, Inativar" : "Sim, Reativar";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-3xl border border-orange-100 bg-white p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-200">
        <div className="flex items-start justify-between">
          <div
            className={`flex h-12 w-12 items-center justify-center rounded-2xl ${
              isActive
                ? "bg-red-50 text-red-600"
                : "bg-emerald-50 text-emerald-600"
            }`}
          >
            {isActive ? (
              <UserX className="h-6 w-6" />
            ) : (
              <UserCheck className="h-6 w-6" />
            )}
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-500 hover:bg-slate-200 transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div>
          <h3 className="text-xl font-black text-slate-900 tracking-tight">
            {actionTitle}
          </h3>
          <p className="mt-1 text-sm font-semibold text-slate-700">
            Deseja alterar a situação cadastral de{" "}
            <span className="font-black text-slate-950 uppercase">{person.name}</span>?
          </p>
        </div>

        <div className="rounded-2xl border border-slate-100 bg-slate-50 p-4 text-xs font-medium text-slate-600 space-y-1">
          <p className="font-bold text-slate-700">
            CPF/CNPJ: {person.document || "Não informado"}
          </p>
          {isActive ? (
            <p className="text-slate-500">
              Ao inativar, a pessoa não aparecerá em novos contratos ou lançamentos, mas todo o seu histórico financeiro e contratual continuará preservado.
            </p>
          ) : (
            <p className="text-slate-500">
              Ao reativar, a pessoa voltará a ficar disponível para novos contratos, vínculos a bens e movimentações.
            </p>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs font-black text-slate-700 hover:bg-slate-50 transition"
          >
            Cancelar
          </button>

          <button
            type="button"
            onClick={onConfirm}
            disabled={isProcessing}
            className={`rounded-xl px-5 py-2.5 text-xs font-black text-white shadow-md transition ${
              isActive
                ? "bg-red-600 hover:bg-red-700 shadow-red-500/20"
                : "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/20"
            } disabled:opacity-50`}
          >
            {isProcessing ? "Processando..." : actionButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}
