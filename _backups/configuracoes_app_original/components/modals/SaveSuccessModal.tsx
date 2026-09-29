"use client";

import React from "react";
import { CheckCircle2, ArrowLeft, Settings } from "lucide-react";

interface SaveSuccessModalProps {
  isOpen: boolean;
  title?: string;
  message?: string;
  onStay: () => void;
  onGoBack: () => void;
}

export const SaveSuccessModal: React.FC<SaveSuccessModalProps> = ({
  isOpen,
  title = "Informações salvas com sucesso!",
  message = "As alterações foram registradas no sistema. O que você deseja fazer agora?",
  onStay,
  onGoBack,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-6 backdrop-blur-sm">
      <div className="contrx-modal-panel w-full max-w-md overflow-hidden rounded-2xl border border-emerald-100 bg-white p-6 shadow-2xl">
        <div className="flex flex-col items-center text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 shadow-inner">
            <CheckCircle2 className="h-10 w-10 text-emerald-500" />
          </div>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            {title}
          </h2>

          <p className="mt-2 text-xs font-medium leading-relaxed text-slate-500">
            {message}
          </p>
        </div>

        <div className="mt-6 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
          <button
            type="button"
            onClick={onStay}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300"
          >
            <Settings className="h-4 w-4 text-slate-500" />
            <span>Manter em configurações</span>
          </button>

          <button
            type="button"
            onClick={onGoBack}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-500/30"
          >
            <ArrowLeft className="h-4 w-4 text-white" />
            <span>Voltar ao sistema</span>
          </button>
        </div>
      </div>
    </div>
  );
};
