"use client";

import React from "react";
import { Property } from "./asset-types";
import { AlertCircle, AlertTriangle } from "lucide-react";

interface AssetInactivateModalProps {
  propertyToInactivate: Property | null;
  blockedProperty: Property | null;
  isProcessing: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onCloseBlocked: () => void;
}

export function AssetInactivateModal({
  propertyToInactivate,
  blockedProperty,
  isProcessing,
  onConfirm,
  onCancel,
  onCloseBlocked,
}: AssetInactivateModalProps) {
  if (blockedProperty) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border border-red-200 bg-white p-6 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-black text-slate-900">
            Ação Bloqueada
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            O bem/ativo{" "}
            <span className="font-black text-slate-900">
              &quot;{blockedProperty.name}&quot;
            </span>{" "}
            possui um contrato de locação ativo. Não é permitido inativá-lo
            enquanto o contrato estiver em vigor.
          </p>
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={onCloseBlocked}
              className="rounded-2xl bg-slate-900 px-5 py-2.5 text-xs font-black text-white hover:bg-slate-800"
            >
              Entendido
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (propertyToInactivate) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm">
        <div className="w-full max-w-md rounded-3xl border border-amber-200 bg-white p-6 shadow-2xl">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <h3 className="mt-4 text-lg font-black text-slate-900">
            Inativar Bem/Ativo
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">
            Deseja realmente inativar o bem/ativo{" "}
            <span className="font-black text-slate-900">
              &quot;{propertyToInactivate.name}&quot;
            </span>
            ? Ele deixará de ser sugerido para novos contratos, mas todo o
            histórico e lançamentos financeiros serão preservados.
          </p>
          <div className="mt-6 flex items-center justify-end gap-3">
            <button
              type="button"
              disabled={isProcessing}
              onClick={onCancel}
              className="rounded-2xl bg-slate-100 px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-200 disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="button"
              disabled={isProcessing}
              onClick={onConfirm}
              className="rounded-2xl bg-red-600 px-5 py-2.5 text-xs font-black text-white shadow-md shadow-red-200 hover:bg-red-700 active:scale-95 disabled:opacity-50"
            >
              {isProcessing ? "Inativando..." : "Confirmar Inativação"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
